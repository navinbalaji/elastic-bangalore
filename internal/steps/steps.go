package steps

type Kind int

const (
	KindGuide Kind = iota
	KindVerifiable
)

type Status int

const (
	StatusPending Status = iota
	StatusRunning
	StatusPass
	StatusFail
)

type Step struct {
	ID           string
	Module       string
	Label        string
	Kind         Kind
	Instructions string
}

type StepState struct {
	Step   Step
	Status Status
	Reason string
	Marked bool
}

func All() []Step {
	return []Step{
		// Module 1
		{
			ID:     "m1-embeddings",
			Module: "Module 1 — Jina Inference",
			Label:  "Test Jina embedding endpoint",
			Kind:   KindVerifiable,
			Instructions: `Open Kibana → Dev Tools and run:

POST _inference/.jina-embeddings-v5-text-small
{
  "input": "There is no reason anyone would want a computer in their home"
}

Expected: response with text_embedding array of floating-point numbers.`,
		},
		{
			ID:     "m1-index",
			Module: "Module 1 — Jina Inference",
			Label:  "Create rerank-demo index",
			Kind:   KindVerifiable,
			Instructions: `PUT rerank-demo
{
  "mappings": {
    "properties": {
      "content": { "type": "text" }
    }
  }
}`,
		},
		{
			ID:     "m1-bulk",
			Module: "Module 1 — Jina Inference",
			Label:  "Bulk index 11 documents",
			Kind:   KindVerifiable,
			Instructions: `POST rerank-demo/_bulk
{ "index": {} }
{ "content": "Washington, D.C. (also known as simply Washington or D.C., and officially as the District of Columbia) is the capital of the United States. It is a federal district." }
... (11 documents total — see lab-guide.md)

Then verify: GET rerank-demo/_count → count: 11`,
		},
		{
			ID:     "m1-mapping",
			Module: "Module 1 — Jina Inference",
			Label:  "Verify mapping",
			Kind:   KindVerifiable,
			Instructions: `GET /rerank-demo/_mapping

Expected: content field type is "text".`,
		},
		{
			ID:     "m1-search",
			Module: "Module 1 — Jina Inference",
			Label:  "Search without reranking",
			Kind:   KindVerifiable,
			Instructions: `POST rerank-demo/_search
{
  "size": 10,
  "query": { "match": { "content": "Capital of the USA?" } },
  "_source": false,
  "fields": ["content"]
}

Observe: Washington D.C. is recalled but not ranked #1.`,
		},
		{
			ID:     "m1-rerank",
			Module: "Module 1 — Jina Inference",
			Label:  "Search with Jina reranker",
			Kind:   KindVerifiable,
			Instructions: `POST rerank-demo/_search
{
  "size": 10,
  "retriever": {
    "text_similarity_reranker": {
      "retriever": {
        "standard": {
          "query": { "match": { "content": "What is the capital of the USA?" } }
        }
      },
      "field": "content",
      "inference_id": ".jina-reranker-v3",
      "inference_text": "What is the capital of the USA?",
      "rank_window_size": 10,
      "min_score": 0
    }
  },
  "_source": false,
  "fields": ["content"]
}

Expected: Washington D.C. is the #1 result.`,
		},

		// Module 2
		{
			ID:     "m2-upload-guide",
			Module: "Module 2 — Semantic Text",
			Label:  "Upload Harry Potter PDF in Kibana",
			Kind:   KindGuide,
			Instructions: `1. Download harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf
2. Kibana → Search → Integrations → Upload a File
3. Index name: harrypotter
4. Upload PDF — do NOT click Import yet
5. Advanced Options → Semantic Text Fields
6. Add field content_jina with .jina-embeddings-v5-text-small
7. Click Import (wait a few minutes)

Complete in Kibana — verification happens on the next step.`,
		},
		{
			ID:     "m2-verify-index",
			Module: "Module 2 — Semantic Text",
			Label:  "Verify harrypotter index",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify:
- Index harrypotter exists
- Field content_jina is semantic_text with .jina-embeddings-v5-text-small
- At least one document indexed`,
		},

		// Module 3
		{
			ID:     "m3-upload-guide",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "Upload properties-dataset.csv",
			Kind:   KindGuide,
			Instructions: `1. Download properties-dataset.csv from the repo
2. Kibana → Search → Integrations → Upload a File
3. Index name: properties
4. Advanced Options → paste mappings from lab-guide.md (body_content_jina semantic_text)
5. Add geo_point for location (optional longitude/latitude fields)
6. Click Import

Complete in Kibana — verification happens on the next step.`,
		},
		{
			ID:     "m3-verify-index",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "Verify properties index",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify:
- Index properties exists
- body_content_jina is semantic_text
- location is geo_point
- Documents indexed`,
		},
		{
			ID:     "m3-english-search",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "English semantic + geo search",
			Kind:   KindVerifiable,
			Instructions: `In Kibana → Discover → Query in ES|QL:

FROM properties METADATA _score
| WHERE MATCH(body_content_jina, "House with direct beach access and nature walks")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| KEEP title, miles, _score
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10

Expected: 1 E Scott Street appears in top results.`,
		},
		{
			ID:     "m3-french-search",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "French cross-language search",
			Kind:   KindVerifiable,
			Instructions: `Same query with French MATCH string:
"Maison avec accès direct à la plage et balades en pleine nature"

Expected: same property surfaces without translation.`,
		},
		{
			ID:     "m3-completion",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "ES|QL COMPLETION",
			Kind:   KindVerifiable,
			Instructions: `Run the COMPLETION query from lab-guide.md section 3.3
using .anthropic-claude-4.6-opus-completion inference ID.

Expected: non-empty LLM outcome in response.`,
		},
		{
			ID:     "m3-lang-detect",
			Module: "Module 3 — Multilingual ES|QL",
			Label:  "Language detection (ML UI)",
			Kind:   KindGuide,
			Instructions: `Kibana → Machine Learning → Trained Models
→ lang_ident_model_1 → Test

Test German: Haus mit direktem Strandzugang und Naturwanderwegen
Expected: DE

Test Hindi: समुद्र तट तक सीधी पहुंच और प्रकृति भ्रमण के साथ घर
Expected: HI

This step is guide-only (no API verification).`,
		},

		// Module 4
		{
			ID:     "m4-index-guide",
			Module: "Module 4 — Workflows",
			Label:  "Create user_emails index + your doc",
			Kind:   KindGuide,
			Instructions: `PUT user_emails
{
  "mappings": {
    "properties": {
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "email-address": { "type": "keyword" }
    }
  }
}

POST user_emails/_doc
{
  "name": "YOUR-FIRST-NAME",
  "email-address": "your-email@example.com"
}`,
		},
		{
			ID:     "m4-verify-index",
			Module: "Module 4 — Workflows",
			Label:  "Verify user_emails index",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify user_emails exists with at least 1 document.`,
		},
		{
			ID:     "m4-workflow-guide",
			Module: "Module 4 — Workflows",
			Label:  "Create send-email-with-lookup workflow",
			Kind:   KindGuide,
			Instructions: `Kibana → Workflows → Create a new workflow
Paste the YAML from lab-guide.md section 4.2
(name: send-email-with-lookup) and Save.

Test manually with Play button (not auto-verified).`,
		},
		{
			ID:     "m4-verify-workflow",
			Module: "Module 4 — Workflows",
			Label:  "Verify workflow exists",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify workflow send-email-with-lookup exists via Kibana API.`,
		},

		// Module 5
		{
			ID:     "m5-tool-email-guide",
			Module: "Module 5 — Agent Builder",
			Label:  "Create potter.send.email tool",
			Kind:   KindGuide,
			Instructions: `Kibana → Agent Builder → Tools → New Tool
Type: Workflow → send-email-with-lookup
Tool ID: potter.send.email
Save & test.`,
		},
		{
			ID:     "m5-verify-tool-email",
			Module: "Module 5 — Agent Builder",
			Label:  "Verify potter.send.email tool",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify tool potter.send.email exists.`,
		},
		{
			ID:     "m5-tool-search-guide",
			Module: "Module 5 — Agent Builder",
			Label:  "Create potter.chapter.5 tool",
			Kind:   KindGuide,
			Instructions: `New Tool → Type: Index Search
Target: harrypotter
Tool ID: potter.chapter.5
Save.`,
		},
		{
			ID:     "m5-verify-tool-search",
			Module: "Module 5 — Agent Builder",
			Label:  "Verify potter.chapter.5 tool",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify tool potter.chapter.5 exists.`,
		},
		{
			ID:     "m5-skill-guide",
			Module: "Module 5 — Agent Builder",
			Label:  "Create ministry-of-magic skill",
			Kind:   KindGuide,
			Instructions: `Agent Builder → Skills → Add skill
ID: ministry-of-magic
Associate tool: potter.chapter.5
Save.`,
		},
		{
			ID:     "m5-verify-skill",
			Module: "Module 5 — Agent Builder",
			Label:  "Verify ministry-of-magic skill",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify skill ministry-of-magic exists.`,
		},
		{
			ID:     "m5-agent-guide",
			Module: "Module 5 — Agent Builder",
			Label:  "Create potter-answers agent",
			Kind:   KindGuide,
			Instructions: `Agent Builder → New agent
Agent ID: potter-answers
Display Name: Potter Answers
Attach tools: potter.chapter.5, potter.send.email
Attach skill: ministry-of-magic
Save.`,
		},
		{
			ID:     "m5-verify-agent",
			Module: "Module 5 — Agent Builder",
			Label:  "Verify potter-answers agent",
			Kind:   KindVerifiable,
			Instructions: `Press Enter to verify agent potter-answers exists with both tools attached.`,
		},
		{
			ID:     "m5-test-guide",
			Module: "Module 5 — Agent Builder",
			Label:  "Test agent in Kibana chat",
			Kind:   KindGuide,
			Instructions: `Ask Potter Answers:
"What is Quidditch, and which Hogwarts House does Hagrid warn Harry against?"

Try /Ministry of Magic skill in a new chat.

Guide-only — not auto-verified.`,
		},

		// Module 6
		{
			ID:     "m6-inspector-guide",
			Module: "Module 6 — A2A",
			Label:  "Run A2A Inspector locally",
			Kind:   KindGuide,
			Instructions: `git clone https://github.com/a2aproject/a2a-inspector.git
cd a2a-inspector
uv sync
cd frontend && npm install && cd ..
bash scripts/run.sh

Open http://127.0.0.1:5001`,
		},
		{
			ID:     "m6-verify-agent-card",
			Module: "Module 6 — A2A",
			Label:  "Verify A2A agent card",
			Kind:   KindVerifiable,
			Instructions: `Agent card URL:
{KIBANA_URL}/api/agent_builder/a2a/potter-answers.json

Auth: ApiKey <your-api-key>

Press Enter to verify the agent card is reachable.`,
		},
		{
			ID:     "m6-chat-guide",
			Module: "Module 6 — A2A",
			Label:  "Chat via A2A Inspector",
			Kind:   KindGuide,
			Instructions: `In A2A Inspector Live Chat, ask the same Potter questions.
Check Debug Console for JSON-RPC messages.

Guide-only — not auto-verified.`,
		},
	}
}

func InitialStates() []StepState {
	all := All()
	states := make([]StepState, len(all))
	for i, s := range all {
		states[i] = StepState{Step: s, Status: StatusPending}
	}
	return states
}
