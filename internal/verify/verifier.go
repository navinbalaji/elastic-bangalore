package verify

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type Result struct {
	Pass   bool
	Reason string
}

type Verifier struct {
	Clients *Clients
}

func NewVerifier(c *Clients) *Verifier {
	return &Verifier{Clients: c}
}

func (v *Verifier) Verify(ctx context.Context, stepID string) Result {
	switch stepID {
	case "m1-embeddings":
		return v.m1Embeddings(ctx)
	case "m1-index":
		return v.indexExists(ctx, "rerank-demo")
	case "m1-bulk":
		return v.docCount(ctx, "rerank-demo", 11)
	case "m1-mapping":
		return v.fieldType(ctx, "rerank-demo", "content", "text")
	case "m1-search":
		return v.m1Search(ctx)
	case "m1-rerank":
		return v.m1Rerank(ctx)
	case "m2-verify-index":
		return v.m2HarryPotter(ctx)
	case "m3-verify-index":
		return v.m3Properties(ctx)
	case "m3-english-search":
		return v.m3EnglishSearch(ctx)
	case "m3-french-search":
		return v.m3FrenchSearch(ctx)
	case "m3-completion":
		return v.m3Completion(ctx)
	case "m4-verify-index":
		return v.docCountAtLeast(ctx, "user_emails", 1)
	case "m4-verify-workflow":
		return v.m4Workflow(ctx)
	case "m5-verify-tool-email":
		return v.kibanaResource(ctx, "/api/agent_builder/tools/potter.send.email", "tool potter.send.email")
	case "m5-verify-tool-search":
		return v.kibanaResource(ctx, "/api/agent_builder/tools/potter.chapter.5", "tool potter.chapter.5")
	case "m5-verify-skill":
		return v.kibanaResource(ctx, "/api/agent_builder/skills/ministry-of-magic", "skill ministry-of-magic")
	case "m5-verify-agent":
		return v.m5Agent(ctx)
	case "m6-verify-agent-card":
		return v.m6AgentCard(ctx)
	default:
		return Result{Pass: false, Reason: "no verifier for this step"}
	}
}

func (v *Verifier) indexExists(ctx context.Context, index string) Result {
	ok, err := v.Clients.IndexExists(ctx, index)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("check failed: %v%s", err, authHint(err))}
	}
	if !ok {
		return Result{Pass: false, Reason: fmt.Sprintf("index %q does not exist", index)}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("index %q exists", index)}
}

func (v *Verifier) docCount(ctx context.Context, index string, want int64) Result {
	count, err := v.Clients.DocCount(ctx, index)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("count failed: %v%s", err, authHint(err))}
	}
	if count != want {
		return Result{Pass: false, Reason: fmt.Sprintf("expected %d documents, got %d", want, count)}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("%d documents indexed", count)}
}

func (v *Verifier) docCountAtLeast(ctx context.Context, index string, min int64) Result {
	count, err := v.Clients.DocCount(ctx, index)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("count failed: %v%s", err, authHint(err))}
	}
	if count < min {
		return Result{Pass: false, Reason: fmt.Sprintf("expected at least %d documents, got %d", min, count)}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("%d document(s) found", count)}
}

func (v *Verifier) fieldType(ctx context.Context, index, field, want string) Result {
	typ, err := v.Clients.GetMappingFieldType(ctx, index, field)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("mapping check failed: %v%s", err, authHint(err))}
	}
	if typ != want {
		return Result{Pass: false, Reason: fmt.Sprintf("field %q type is %q, expected %q", field, typ, want)}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("field %q is type %q", field, typ)}
}

func (v *Verifier) m1Embeddings(ctx context.Context) Result {
	out, err := v.Clients.RawInference(ctx, ".jina-embeddings-v5-text-small",
		"There is no reason anyone would want a computer in their home")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("inference failed: %v%s", err, authHint(err))}
	}
	emb, ok := out["text_embedding"]
	if !ok {
		return Result{Pass: false, Reason: "response missing text_embedding"}
	}
	arr, ok := emb.([]any)
	if !ok || len(arr) == 0 {
		return Result{Pass: false, Reason: "text_embedding is empty"}
	}
	return Result{Pass: true, Reason: "Jina embedding endpoint returned vectors"}
}

func (v *Verifier) m1Search(ctx context.Context) Result {
	body := map[string]any{
		"size":    10,
		"query":   map[string]any{"match": map[string]any{"content": "Capital of the USA?"}},
		"_source": false,
		"fields":  []string{"content"},
	}
	out, err := v.Clients.RawSearch(ctx, "rerank-demo", body)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("search failed: %v%s", err, authHint(err))}
	}
	hits, _ := out["hits"].(map[string]any)
	total, _ := hits["total"].(map[string]any)
	value, _ := total["value"].(float64)
	if value < 1 {
		return Result{Pass: false, Reason: "search returned no hits"}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("search returned %d hit(s)", int(value))}
}

func (v *Verifier) m1Rerank(ctx context.Context) Result {
	body := map[string]any{
		"size": 10,
		"retriever": map[string]any{
			"text_similarity_reranker": map[string]any{
				"retriever": map[string]any{
					"standard": map[string]any{
						"query": map[string]any{
							"match": map[string]any{"content": "What is the capital of the USA?"},
						},
					},
				},
				"field":            "content",
				"inference_id":     ".jina-reranker-v3",
				"inference_text":   "What is the capital of the USA?",
				"rank_window_size": 10,
				"min_score":        0,
			},
		},
		"_source": false,
		"fields":  []string{"content"},
	}
	out, err := v.Clients.RawSearch(ctx, "rerank-demo", body)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("rerank search failed: %v%s", err, authHint(err))}
	}
	top := topHitContent(out)
	if !strings.Contains(top, "Washington, D.C.") {
		return Result{Pass: false, Reason: "top result is not Washington, D.C.: " + truncate(top, 80)}
	}
	return Result{Pass: true, Reason: "Washington, D.C. is the top reranked result"}
}

func (v *Verifier) m2HarryPotter(ctx context.Context) Result {
	if r := v.indexExists(ctx, "harrypotter"); !r.Pass {
		return r
	}
	typ, err := v.Clients.GetMappingFieldType(ctx, "harrypotter", "content_jina")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("mapping check failed: %v", err)}
	}
	if typ != "semantic_text" {
		return Result{Pass: false, Reason: fmt.Sprintf("content_jina type is %q, expected semantic_text", typ)}
	}
	inf, err := v.Clients.GetSemanticTextInferenceID(ctx, "harrypotter", "content_jina")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("inference_id check failed: %v", err)}
	}
	if inf != ".jina-embeddings-v5-text-small" {
		return Result{Pass: false, Reason: fmt.Sprintf("inference_id is %q, expected .jina-embeddings-v5-text-small", inf)}
	}
	return v.docCountAtLeast(ctx, "harrypotter", 1)
}

func (v *Verifier) m3Properties(ctx context.Context) Result {
	if r := v.indexExists(ctx, "properties"); !r.Pass {
		return r
	}
	for _, check := range []struct{ field, typ string }{
		{"body_content_jina", "semantic_text"},
		{"location", "geo_point"},
	} {
		if r := v.fieldType(ctx, "properties", check.field, check.typ); !r.Pass {
			return r
		}
	}
	return v.docCountAtLeast(ctx, "properties", 1)
}

func (v *Verifier) m3EnglishSearch(ctx context.Context) Result {
	res, err := v.Clients.RunESQL(ctx, EnglishPropertyQuery)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("ES|QL failed: %v%s", err, authHint(err))}
	}
	if !res.HasTitleContaining("1 E Scott Street") {
		return Result{Pass: false, Reason: "1 E Scott Street not found in top 10 results"}
	}
	return Result{Pass: true, Reason: "English query returned 1 E Scott Street within 10mi"}
}

func (v *Verifier) m3FrenchSearch(ctx context.Context) Result {
	res, err := v.Clients.RunESQL(ctx, FrenchPropertyQuery)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("ES|QL failed: %v%s", err, authHint(err))}
	}
	if !res.HasTitleContaining("1 E Scott Street") {
		return Result{Pass: false, Reason: "1 E Scott Street not found in French query results"}
	}
	return Result{Pass: true, Reason: "French query returned same property (cross-language search works)"}
}

func (v *Verifier) m3Completion(ctx context.Context) Result {
	res, err := v.Clients.RunESQL(ctx, CompletionQuery)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("COMPLETION query failed: %v%s", err, authHint(err))}
	}
	if !res.HasNonEmptyColumn("outcome") {
		return Result{Pass: false, Reason: "outcome column is empty — check Anthropic inference endpoint"}
	}
	return Result{Pass: true, Reason: "COMPLETION returned LLM outcome"}
}

func (v *Verifier) m4Workflow(ctx context.Context) Result {
	body, code, err := v.Clients.KibanaGet(ctx, "/api/workflows?size=100&page=1")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("workflows API failed: %v", err)}
	}
	if code == 403 {
		return Result{Pass: false, Reason: "403 forbidden — API key needs workflowsManagement:read"}
	}
	if code != 200 {
		return Result{Pass: false, Reason: fmt.Sprintf("workflows API returned %d: %s", code, truncate(string(body), 120))}
	}

	var resp struct {
		Results []struct {
			Name       string `json:"name"`
			Definition struct {
				Name string `json:"name"`
			} `json:"definition"`
		} `json:"results"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("parse workflows response: %v", err)}
	}

	want := "send-email-with-lookup"
	for _, wf := range resp.Results {
		if wf.Name == want || wf.Definition.Name == want {
			return Result{Pass: true, Reason: fmt.Sprintf("workflow %q found", want)}
		}
	}
	return Result{Pass: false, Reason: fmt.Sprintf("workflow %q not found", want)}
}

func (v *Verifier) kibanaResource(ctx context.Context, path, label string) Result {
	body, code, err := v.Clients.KibanaGet(ctx, path)
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("%s check failed: %v", label, err)}
	}
	if code == 403 {
		return Result{Pass: false, Reason: fmt.Sprintf("403 forbidden — API key needs agentBuilder:read for %s", label)}
	}
	if code == 404 {
		return Result{Pass: false, Reason: fmt.Sprintf("%s not found (404)", label)}
	}
	if code != 200 {
		return Result{Pass: false, Reason: fmt.Sprintf("%s returned %d: %s", label, code, truncate(string(body), 120))}
	}
	return Result{Pass: true, Reason: fmt.Sprintf("%s exists", label)}
}

func (v *Verifier) m5Agent(ctx context.Context) Result {
	body, code, err := v.Clients.KibanaGet(ctx, "/api/agent_builder/agents/potter-answers")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("agent check failed: %v", err)}
	}
	if code != 200 {
		return Result{Pass: false, Reason: fmt.Sprintf("agent potter-answers returned %d", code)}
	}

	raw := strings.ToLower(string(body))
	for _, tool := range []string{"potter.chapter.5", "potter.send.email"} {
		if !strings.Contains(raw, strings.ToLower(tool)) {
			return Result{Pass: false, Reason: fmt.Sprintf("agent missing tool %q", tool)}
		}
	}
	return Result{Pass: true, Reason: "agent potter-answers exists with both tools"}
}

func (v *Verifier) m6AgentCard(ctx context.Context) Result {
	body, code, err := v.Clients.KibanaGet(ctx, "/api/agent_builder/a2a/potter-answers.json")
	if err != nil {
		return Result{Pass: false, Reason: fmt.Sprintf("agent card check failed: %v", err)}
	}
	if code == 404 {
		return Result{Pass: false, Reason: "agent card not found — create potter-answers agent first"}
	}
	if code != 200 {
		return Result{Pass: false, Reason: fmt.Sprintf("agent card returned %d: %s", code, truncate(string(body), 120))}
	}

	var card map[string]any
	if err := json.Unmarshal(body, &card); err != nil {
		return Result{Pass: false, Reason: "agent card is not valid JSON"}
	}
	if len(card) == 0 {
		return Result{Pass: false, Reason: "agent card JSON is empty"}
	}
	return Result{Pass: true, Reason: "A2A agent card is reachable"}
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
