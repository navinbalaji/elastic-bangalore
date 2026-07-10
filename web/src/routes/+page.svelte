<script lang="ts">
	import { goto } from '$app/navigation';
	import HeaderGithubLink from '$lib/components/HeaderGithubLink.svelte';
	import { onMount } from 'svelte';
	import { getOrCreateUserKey } from '$lib/user-key';
	import { hasCredentials } from '$lib/credentials-storage';

	let name = $state('');
	let loading = $state(false);
	let error = $state('');
	let userKey = $state('');
	let resume = $state<{
		sessionId: string;
		name: string;
		complete: boolean;
		percent: number;
		progress: { passed: number; total: number };
	} | null>(null);

	onMount(async () => {
		userKey = getOrCreateUserKey();
		try {
			const res = await fetch(`/api/resume?userKey=${encodeURIComponent(userKey)}`);
			if (!res.ok) return;
			const data = await res.json();
			if (data.sessionId) {
				resume = data;
				name = data.name;
			}
		} catch {
			// ignore
		}
	});

	function workshopPath(sessionId: string) {
		return hasCredentials(sessionId) ? `/workshop/${sessionId}` : `/workshop/${sessionId}/setup`;
	}

	async function continueSession() {
		if (!resume) return;
		await goto(workshopPath(resume.sessionId));
	}

	async function join() {
		error = '';
		loading = true;
		const key = userKey || getOrCreateUserKey();
		userKey = key;
		try {
			const res = await fetch('/api/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, userKey: key })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error ?? 'Could not join';
				return;
			}
			await goto(workshopPath(data.sessionId));
		} catch {
			error = 'Network error — try again';
		} finally {
			loading = false;
		}
	}
</script>

<div class="header">
	<div class="logo">ELASTIC <span>BANGALORE</span></div>
	<div class="header-actions">
		<HeaderGithubLink />
		<a href="/admin" class="btn btn-secondary" style="text-decoration:none;font-size:0.875rem">Admin</a>
	</div>
</div>

<main class="container" style="max-width:560px;padding-top:4rem">
	{#if resume}
		<div class="card" style="margin-bottom:1rem;border-color:var(--accent-dim)">
			<h2 style="margin:0 0 0.5rem;font-size:1.1rem">Welcome back, {resume.name}</h2>
			<p style="color:var(--muted);margin:0 0 1rem;font-size:0.9rem">
				{#if resume.complete}
					Workshop complete — you can review your steps.
				{:else}
					Progress saved: {resume.progress.passed}/{resume.progress.total} steps ({resume.percent}%)
				{/if}
			</p>
			<button class="btn btn-primary" type="button" onclick={continueSession} style="width:100%">
				Continue workshop
			</button>
		</div>
	{/if}

	<div class="card" style="text-align:center">
		<h1 style="margin:0 0 0.5rem;font-size:1.75rem">Workshop Lab</h1>
		<p style="color:var(--muted);margin:0 0 1.5rem">
			Agentic Workflows &amp; Searchable Applications with Elasticsearch, Jina, and A2A
		</p>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				join();
			}}
			style="text-align:left"
		>
			<label class="label" for="name">Your name</label>
			<input
				id="name"
				class="input"
				type="text"
				placeholder="e.g. Navin"
				bind:value={name}
				autocomplete="name"
				required
				minlength="2"
			/>

			{#if error}
				<div class="alert alert-error" style="margin-top:1rem">{error}</div>
			{/if}

			<button class="btn btn-primary" type="submit" disabled={loading} style="width:100%;margin-top:1.25rem">
				{loading ? 'Joining…' : resume ? 'Continue as this name' : 'Enter workshop'}
			</button>
		</form>
	</div>

	<p style="text-align:center;color:var(--muted);font-size:0.875rem;margin-top:1.5rem">
		Your progress is tied to this browser (local storage). Elastic credentials also stay in this
		browser only.
	</p>
</main>
