package config

import (
	"fmt"
	"net/url"
	"strings"
)

// Field help text sourced from Elastic docs:
// https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details

const (
	HelpCloudOrES = `WHERE TO FIND — Cloud ID or Elasticsearch URL

Option A — Elasticsearch URL (recommended for this CLI)
  1. Go to https://cloud.elastic.co
  2. Open your project / deployment
  3. Click Help (?) → Connection details
  4. Endpoints tab → copy "Elasticsearch endpoint"
  Example:
    https://my-project-d9fc53.es.us-central1.gcp.elastic.cloud

Option B — Cloud ID (classic format)
  Same Connection details screen → toggle "Show Cloud ID"
  Example:
    my-deployment-name:ZXhYQ2xvdWQ...base64...`

	HelpAPIKey = `WHERE TO FIND — API Key (Encoded / Base64)

  1. Open Kibana (from Elastic Cloud → Open Kibana)
  2. Search bar → type "API keys"
  3. Create API key → set privileges → Create
  4. Copy the ENCODED key shown once (long base64 string)

  Use in Authorization header as:
    ApiKey <your-encoded-key>

  Tip: Press Ctrl+U on this field to clear and paste a new key.

  Do NOT paste the API key into the Kibana URL field.`

	HelpKibanaURL = `WHERE TO FIND — Kibana URL

  1. Go to https://cloud.elastic.co
  2. Open your project / deployment
  3. Click "Open Kibana" (or find Kibana under Applications)
  4. Copy the browser URL base (no path after the host)

  Example:
    https://my-project-d9fc53.kb.us-central1.gcp.elastic.cloud:9243

  Serverless: Help (?) → Connection details may list Kibana endpoint.

  Must start with https:// — this is NOT your API key.`
)

func ParseConnectionInput(input string) (cloudID, elasticsearchURL string, err error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", "", fmt.Errorf("Cloud ID or Elasticsearch URL is required")
	}

	if strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://") {
		u, parseErr := url.Parse(input)
		if parseErr != nil || u.Host == "" {
			return "", "", fmt.Errorf("invalid Elasticsearch URL — copy the full https://... endpoint from Connection details")
		}
		return "", strings.TrimRight(input, "/"), nil
	}

	if strings.Contains(input, "://") {
		return "", "", fmt.Errorf("Elasticsearch URL must start with https:// (from Connection details → Elasticsearch endpoint)")
	}

	// Cloud ID is typically deployment-name:base64
	if strings.HasPrefix(strings.ToLower(input), "http") {
		return "", "", fmt.Errorf("Cloud ID is not a URL — use the Elasticsearch endpoint URL in this field, or toggle Show Cloud ID for the name:base64 value")
	}

	return input, "", nil
}

func ValidateCredentials(cloudOrES, apiKey, kibanaURL string) (*Config, error) {
	cloudID, esURL, err := ParseConnectionInput(cloudOrES)
	if err != nil {
		return nil, err
	}

	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required — create one in Kibana → search \"API keys\" → copy the Encoded (base64) key")
	}

	kibanaURL = strings.TrimSpace(kibanaURL)
	if kibanaURL == "" {
		return nil, fmt.Errorf("Kibana URL is required — open Kibana from cloud.elastic.co and copy the https://...kb... URL")
	}

	if err := validateKibanaURL(kibanaURL, apiKey); err != nil {
		return nil, err
	}

	if err := validateAPIKey(apiKey); err != nil {
		return nil, err
	}

	cfg := &Config{
		CloudID:          cloudID,
		ElasticsearchURL: esURL,
		APIKey:           apiKey,
		KibanaURL:        strings.TrimRight(kibanaURL, "/"),
	}
	return cfg, nil
}

func validateKibanaURL(kibanaURL, apiKey string) error {
	if strings.HasPrefix(kibanaURL, "http://") || strings.HasPrefix(kibanaURL, "https://") {
		u, err := url.Parse(kibanaURL)
		if err != nil || u.Host == "" {
			return fmt.Errorf("invalid Kibana URL — use https://your-project.kb.region.cloud.es.io:9243")
		}
		if !strings.Contains(strings.ToLower(u.Host), "kb") && !strings.Contains(strings.ToLower(u.Host), "kibana") {
			return fmt.Errorf("Kibana URL should contain .kb. in the hostname — you may have pasted the Elasticsearch URL instead")
		}
		return nil
	}

	if looksLikeAPIKey(kibanaURL) {
		return fmt.Errorf("field 3 looks like an API key, not a Kibana URL — paste https://...kb...elastic.cloud here; put the API key in field 2 only")
	}

	if looksLikeAPIKey(apiKey) && kibanaURL == apiKey {
		return fmt.Errorf("Kibana URL and API key cannot be the same value")
	}

	return fmt.Errorf("Kibana URL must start with https:// — copy it from Elastic Cloud → Open Kibana")
}

func validateAPIKey(apiKey string) error {
	if strings.HasPrefix(apiKey, "http://") || strings.HasPrefix(apiKey, "https://") {
		return fmt.Errorf("API key field contains a URL — paste the Encoded base64 API key from Kibana → API keys")
	}
	if strings.Contains(apiKey, " ") {
		return fmt.Errorf("API key should not contain spaces — paste only the Encoded key (or ApiKey prefix is added automatically)")
	}
	if strings.HasPrefix(strings.ToLower(apiKey), "apikey ") {
		return fmt.Errorf("paste only the key value — do not include the \"ApiKey \" prefix")
	}
	return nil
}

func looksLikeAPIKey(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 40 {
		return false
	}
	if strings.Contains(s, "://") {
		return false
	}
	// base64-ish: alphanumeric + / + = only
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= 'A' && r <= 'Z':
		case r >= '0' && r <= '9':
		case r == '+' || r == '/' || r == '=':
		default:
			return false
		}
	}
	return strings.HasSuffix(s, "==") || strings.HasSuffix(s, "=")
}

func (c *Config) ConnectionDisplayValue() string {
	if c.ElasticsearchURL != "" {
		return c.ElasticsearchURL
	}
	return c.CloudID
}

func FriendlyClientError(err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "cannot parse CloudID"):
		return "Cloud ID is invalid. Use the Elasticsearch URL instead (Help → Connection details → Elasticsearch endpoint), or toggle Show Cloud ID for the name:base64 value."
	case strings.Contains(msg, "illegal base64"):
		return "Cloud ID parse failed — you may have pasted a URL. Use the full https://...es...elastic.cloud Elasticsearch endpoint in field 1."
	case strings.Contains(msg, "401") || strings.Contains(msg, "security_exception"):
		return "Authentication failed — check the API key is the Encoded (base64) value from Kibana → API keys. Press Ctrl+U on field 2 to replace it."
	case strings.Contains(msg, "connection refused"), strings.Contains(msg, "no such host"):
		return "Cannot reach Elasticsearch — verify the endpoint URL from Connection details."
	default:
		return msg
	}
}
