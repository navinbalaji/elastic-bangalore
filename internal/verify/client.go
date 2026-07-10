package verify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"

	"github.com/elastic-bangalore/workshop/internal/config"
)

type Clients struct {
	ES     *elasticsearch.Client
	Config *config.Config
	HTTP   *http.Client
}

func NewClients(cfg *config.Config) (*Clients, error) {
	esCfg := elasticsearch.Config{
		APIKey: cfg.APIKey,
	}
	if cfg.ElasticsearchURL != "" {
		esCfg.Addresses = []string{cfg.ElasticsearchURL}
	} else {
		esCfg.CloudID = cfg.CloudID
	}

	es, err := elasticsearch.NewClient(esCfg)
	if err != nil {
		return nil, fmt.Errorf("create elasticsearch client: %w", err)
	}

	return &Clients{
		ES:     es,
		Config: cfg,
		HTTP:   &http.Client{Timeout: 60 * time.Second},
	}, nil
}

func (c *Clients) ValidateConnection(ctx context.Context) error {
	// cluster.health is not available on Elastic Cloud Serverless (HTTP 410).
	res, err := esapi.InfoRequest{}.Do(ctx, c.ES)
	if err != nil {
		return fmt.Errorf("elasticsearch connection check failed: %w", err)
	}
	defer res.Body.Close()
	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("elasticsearch connection check error: %s", string(body))
	}
	return nil
}

func (c *Clients) KibanaGet(ctx context.Context, path string) ([]byte, int, error) {
	url := c.Config.KibanaURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "ApiKey "+c.Config.APIKey)
	req.Header.Set("kbn-xsrf", "true")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}

func (c *Clients) IndexExists(ctx context.Context, index string) (bool, error) {
	res, err := esapi.IndicesExistsRequest{Index: []string{index}}.Do(ctx, c.ES)
	if err != nil {
		return false, err
	}
	defer res.Body.Close()
	return res.StatusCode == 200, nil
}

func (c *Clients) DocCount(ctx context.Context, index string) (int64, error) {
	res, err := esapi.CountRequest{Index: []string{index}}.Do(ctx, c.ES)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return 0, err
	}
	if res.IsError() {
		return 0, fmt.Errorf("count error: %s", string(body))
	}
	var out struct {
		Count int64 `json:"count"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return 0, err
	}
	return out.Count, nil
}

type mappingResponse map[string]struct {
	Mappings struct {
		Properties map[string]json.RawMessage `json:"properties"`
	} `json:"mappings"`
}

func (c *Clients) getFieldProperty(ctx context.Context, index, field string) (map[string]any, error) {
	res, err := esapi.IndicesGetMappingRequest{Index: []string{index}}.Do(ctx, c.ES)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.IsError() {
		return nil, fmt.Errorf("mapping error: %s", string(body))
	}

	var parsed mappingResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	idx, ok := parsed[index]
	if !ok {
		return nil, fmt.Errorf("index %q not found in mapping response", index)
	}
	raw, ok := idx.Mappings.Properties[field]
	if !ok {
		return nil, fmt.Errorf("field %q not found in mapping", field)
	}
	var prop map[string]any
	if err := json.Unmarshal(raw, &prop); err != nil {
		return nil, err
	}
	return prop, nil
}

func (c *Clients) GetMappingFieldType(ctx context.Context, index, field string) (string, error) {
	prop, err := c.getFieldProperty(ctx, index, field)
	if err != nil {
		return "", err
	}
	typ, _ := prop["type"].(string)
	if typ == "" {
		return "", fmt.Errorf("field %q has no type", field)
	}
	return typ, nil
}

func (c *Clients) GetSemanticTextInferenceID(ctx context.Context, index, field string) (string, error) {
	prop, err := c.getFieldProperty(ctx, index, field)
	if err != nil {
		return "", err
	}
	inf, _ := prop["inference_id"].(string)
	if inf == "" {
		return "", fmt.Errorf("field %q has no inference_id", field)
	}
	return inf, nil
}

func (c *Clients) RawSearch(ctx context.Context, index string, body map[string]any) (map[string]any, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		return nil, err
	}

	res, err := c.ES.Search(
		c.ES.Search.WithContext(ctx),
		c.ES.Search.WithIndex(index),
		c.ES.Search.WithBody(&buf),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.IsError() {
		return nil, fmt.Errorf("search error: %s", string(data))
	}

	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Clients) RawInference(ctx context.Context, inferenceID, input string) (map[string]any, error) {
	body := map[string]any{"input": input}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		return nil, err
	}

	path := "/_inference/" + inferenceID
	data, err := c.esPost(ctx, path, &buf)
	if err != nil {
		return nil, err
	}

	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Clients) RunESQL(ctx context.Context, query string) (*ESQLResult, error) {
	body := map[string]string{"query": query}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		return nil, err
	}

	res, err := c.ES.EsqlQuery(&buf, c.ES.EsqlQuery.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.IsError() {
		return nil, fmt.Errorf("ES|QL error: %s", string(data))
	}

	var out ESQLResult
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Clients) esPost(ctx context.Context, path string, body io.Reader) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.ES.Transport.Perform(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("request failed (%d): %s", res.StatusCode, string(data))
	}
	return data, nil
}

func hitContent(hit map[string]any) string {
	fields, _ := hit["fields"].(map[string]any)
	if fields == nil {
		return ""
	}
	content, _ := fields["content"].([]any)
	if len(content) == 0 {
		return ""
	}
	s, _ := content[0].(string)
	return s
}

func topHitContent(result map[string]any) string {
	hits, _ := result["hits"].(map[string]any)
	if hits == nil {
		return ""
	}
	hitList, _ := hits["hits"].([]any)
	if len(hitList) == 0 {
		return ""
	}
	first, _ := hitList[0].(map[string]any)
	return hitContent(first)
}

func authHint(err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	if strings.Contains(msg, "403") || strings.Contains(msg, "security_exception") {
		return " (check API key privileges)"
	}
	return ""
}
