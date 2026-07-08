package verify

import (
	"fmt"
	"strings"
)

type ESQLResult struct {
	Columns []struct {
		Name string `json:"name"`
		Type string `json:"type"`
	} `json:"columns"`
	Values [][]any `json:"values"`
}

func (r *ESQLResult) ColumnIndex(name string) int {
	for i, col := range r.Columns {
		if col.Name == name {
			return i
		}
	}
	return -1
}

func (r *ESQLResult) HasTitleContaining(substr string) bool {
	idx := r.ColumnIndex("title")
	if idx < 0 {
		return false
	}
	substr = strings.ToLower(substr)
	for _, row := range r.Values {
		if idx >= len(row) {
			continue
		}
		title, _ := row[idx].(string)
		if strings.Contains(strings.ToLower(title), substr) {
			return true
		}
	}
	return false
}

func (r *ESQLResult) HasNonEmptyColumn(name string) bool {
	idx := r.ColumnIndex(name)
	if idx < 0 {
		return false
	}
	for _, row := range r.Values {
		if idx >= len(row) {
			continue
		}
		val := row[idx]
		if val == nil {
			continue
		}
		s := fmt.Sprint(val)
		if strings.TrimSpace(s) != "" {
			return true
		}
	}
	return false
}

const EnglishPropertyQuery = `FROM properties METADATA _score
| WHERE MATCH(body_content_jina, "House with direct beach access and nature walks")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| KEEP title, miles, _score
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10`

const FrenchPropertyQuery = `FROM properties METADATA _score
| WHERE MATCH(body_content_jina, "Maison avec accès direct à la plage et balades en pleine nature")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| KEEP title, miles, _score
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10`

const CompletionQuery = `FROM properties METADATA _id, _score
| WHERE MATCH(body_content_jina, "House with direct beach access and nature walks")
| EVAL distance = ST_DISTANCE(location, TO_GEOPOINT("POINT(-87.6270 41.9172)"))
| EVAL miles = distance / 1609.34
| WHERE miles <= 10
| SORT _score DESC
| LIMIT 10
| EVAL prompt = CONCAT(
    "**Property details**\n",
    "PropertyID: ", _id, "\n",
    "Title: ", title, "\n",
    "Description: ", ` + "`property-description`" + `, "\n",
    "Features: ", ` + "`property-features`" + `, "\n",
    "Distance from location: ", TO_STRING(miles), " miles\n",
    "Score: ", TO_STRING(_score), "\n\n"
  )
| STATS combined = VALUES(prompt)
| COMPLETION outcome = CONCAT(
    "Based on the search for 'House with direct beach access and nature walks', which property is the best match and why? ",
    MV_CONCAT(combined, ", ")
  ) WITH {"inference_id": ".anthropic-claude-4.6-opus-completion"}
| KEEP outcome`
