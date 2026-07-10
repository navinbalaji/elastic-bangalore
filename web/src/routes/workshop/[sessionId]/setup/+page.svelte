<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CREDENTIALS_DOCS_URL, HELP_API_KEY, HELP_ELASTICSEARCH_URL } from '$lib/credentials-help';
	import { getCredentials, hasCredentials, saveCredentials } from '$lib/credentials-storage';
	import HeaderGithubLink from '$lib/components/HeaderGithubLink.svelte';

	let elasticsearchUrl = $state('');
	let apiKey = $state('');
	let hasSavedApiKey = $state(false);
	let isEditing = $state(false);
	let loading = $state(false);
	let error = $state('');

	const sessionId = $derived($page.params.sessionId);

	onMount(() => {
		const saved = getCredentials(sessionId);
		isEditing = hasCredentials(sessionId);
		if (!saved) return;
		elasticsearchUrl = saved.elasticsearchUrl;
		hasSavedApiKey = Boolean(saved.apiKey);
	});

	async function save() {
		error = '';
		loading = true;
		try {
			const saved = getCredentials(sessionId);
			const finalApiKey = apiKey.trim() || saved?.apiKey || '';
			if (!finalApiKey) {
				error = 'API key is required';
				return;
			}

			const creds = {
				elasticsearchUrl: elasticsearchUrl.trim(),
				apiKey: finalApiKey
			};

			const res = await fetch(`/api/session/${sessionId}/credentials`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(creds)
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error ?? 'Could not validate credentials';
				return;
			}

			saveCredentials(sessionId, creds);
			await goto(`/workshop/${sessionId}`);
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<div class="header">
	<div class="logo">ELASTIC <span>BANGALORE</span></div>
	<div class="header-actions">
		<HeaderGithubLink />
		{#if isEditing}
			<a
				href="/workshop/{sessionId}"
				class="btn btn-secondary"
				style="text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem"
			>Back to workshop</a>
		{/if}
	</div>
</div>

<main class="container" style="max-width:640px;padding-top:2rem">
	<div class="card">
		<h1 style="margin:0 0 0.5rem">{isEditing ? 'Update Elastic Cloud credentials' : 'Elastic Cloud setup'}</h1>
		<p style="color:var(--muted);margin:0 0 1.25rem">
			{#if isEditing}
				Change your deployment credentials below. Leave the API key blank to keep the saved key.
			{:else}
				Enter your Elastic Cloud credentials. They are saved only in this browser (local storage)
				and sent to Elastic for step verification — never stored on the workshop server.
			{/if}
			<a href={CREDENTIALS_DOCS_URL} target="_blank" rel="noopener noreferrer">Elastic connection docs</a>
		</p>

		<div class="setup-mistakes">
			<strong style="color:var(--text)">Common mistakes</strong>
			<ul>
				<li>Use the <code>https://…es…</code> Elasticsearch endpoint (Hosted or Serverless), not the Kibana URL</li>
				<li>Paste the encoded API key only in the API key field</li>
			</ul>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<div style="margin-bottom:1rem">
				<label class="label" for="esUrl">Elasticsearch URL</label>
				<details class="field-help">
					<summary>Where to find this</summary>
					<div class="field-help-body">{HELP_ELASTICSEARCH_URL}</div>
				</details>
				<input
					id="esUrl"
					class="input"
					bind:value={elasticsearchUrl}
					placeholder="https://….es….elastic-cloud.com"
					required
				/>
			</div>

			<div style="margin-bottom:1rem">
				<label class="label" for="apiKey">API key</label>
				<details class="field-help">
					<summary>Where to find this</summary>
					<div class="field-help-body">
						{HELP_API_KEY}{#if isEditing || hasSavedApiKey}

Leave blank to keep your saved key, or paste a new encoded key to replace it.{/if}
					</div>
				</details>
				<input
					id="apiKey"
					class="input"
					type="password"
					bind:value={apiKey}
					placeholder={hasSavedApiKey ? 'Saved — enter again to change' : 'Base64-encoded API key'}
					required={!hasSavedApiKey}
				/>
			</div>

			{#if error}
				<div class="alert alert-error">{error}</div>
			{/if}

			<button class="btn btn-primary" type="submit" disabled={loading}>
				{loading ? 'Testing connection…' : isEditing ? 'Save changes' : 'Save & continue'}
			</button>
		</form>
	</div>
</main>
