package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

const DefaultConfigDir = ".elastic-bangalore"
const DefaultConfigFile = "config.yaml"

type Config struct {
	CloudID          string `yaml:"cloud_id,omitempty"`
	ElasticsearchURL string `yaml:"elasticsearch_url,omitempty"`
	APIKey           string `yaml:"api_key"`
	KibanaURL        string `yaml:"kibana_url"`
}

func DefaultPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, DefaultConfigDir, DefaultConfigFile), nil
}

func Load(path string) (*Config, error) {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return nil, err
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) Validate() error {
	if strings.TrimSpace(c.CloudID) == "" && strings.TrimSpace(c.ElasticsearchURL) == "" {
		return fmt.Errorf("cloud_id or elasticsearch_url is required")
	}
	if strings.TrimSpace(c.APIKey) == "" {
		return fmt.Errorf("api_key is required")
	}
	if strings.TrimSpace(c.KibanaURL) == "" {
		return fmt.Errorf("kibana_url is required")
	}
	c.KibanaURL = strings.TrimRight(strings.TrimSpace(c.KibanaURL), "/")
	c.CloudID = strings.TrimSpace(c.CloudID)
	c.ElasticsearchURL = strings.TrimRight(strings.TrimSpace(c.ElasticsearchURL), "/")
	c.APIKey = strings.TrimSpace(c.APIKey)
	return nil
}

func (c *Config) Save(path string) error {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return err
		}
	}

	if err := c.Validate(); err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

func Exists(path string) bool {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return false
		}
	}
	_, err := os.Stat(path)
	return err == nil
}
