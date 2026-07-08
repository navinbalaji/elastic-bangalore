package config

import "testing"

func TestValidateCredentials_ESURL(t *testing.T) {
	cfg, err := ValidateCredentials(
		"https://my-project.es.us-central1.gcp.elastic.cloud",
		"ZFZRbF9Jb0JDMEoxaVhoR2pSa3Q6dExwdmJSaldRTHFXWEp4TFFlR19Hdw==",
		"https://my-project.kb.us-central1.gcp.elastic.cloud:9243",
	)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ElasticsearchURL == "" {
		t.Fatal("expected elasticsearch_url to be set")
	}
}

func TestValidateCredentials_RejectsAPIKeyAsKibanaURL(t *testing.T) {
	_, err := ValidateCredentials(
		"https://my-project.es.us-central1.gcp.elastic.cloud",
		"ZFZRbF9Jb0JDMEoxaVhoR2pSa3Q6dExwdmJSaldRTHFXWEp4TFFlR19Hdw==",
		"b2VYa1FwOEJHdnRrTTdxSHdrUU46NUVQNWItdFRJc05kSWRpdXFNai1BQQ==",
	)
	if err == nil {
		t.Fatal("expected error when API key pasted as Kibana URL")
	}
}

func TestParseConnectionInput_CloudID(t *testing.T) {
	cloud, es, err := ParseConnectionInput("my-deploy:ZXhYQ2xvdWQ")
	if err != nil {
		t.Fatal(err)
	}
	if cloud == "" || es != "" {
		t.Fatalf("cloud=%q es=%q", cloud, es)
	}
}
