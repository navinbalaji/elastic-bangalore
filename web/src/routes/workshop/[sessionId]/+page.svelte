<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getCredentials, hasCredentials } from '$lib/credentials-storage';

	type StepDownload = {
		href: string;
		label: string;
	};

	type StepRow = {
		id: string;
		module: string;
		label: string;
		kind: string;
		instructions: string;
		download: StepDownload | null;
		status: string;
		reason: string;
		marked: boolean;
	};

	type SessionData = {
		participantName: string;
		cursorIndex: number;
		states: StepRow[];
		progress: { passed: number; total: number };
		complete: boolean;
		guideHtml: string;
		stuckAt: string | null;
		blinkAt: string | null;
	};

	let data = $state<SessionData | null>(null);
	let loading = $state(true);
	let actionLoading = $state(false);
	let stuckLoading = $state(false);
	let error = $state('');
	let showBlink = $state(false);
	let lastBlinkAt = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let stepListEl = $state<HTMLUListElement | null>(null);
	let copyFeedback = $state('');
	let stuckRevokeTimer: ReturnType<typeof setTimeout> | undefined;
	const STUCK_REVOKE_MS = 5000;

	type Doubt = { id: string; message: string; createdAt: string };

	let chatOpen = $state(false);
	let doubts = $state<Doubt[]>([]);
	let doubtMessage = $state('');
	let doubtLoading = $state(false);
	let doubtError = $state('');
	let editingDoubtId = $state<string | null>(null);
	let editingDoubtMessage = $state('');
	let doubtActionId = $state<string | null>(null);

	const sessionId = $derived($page.params.sessionId);
	const cursor = $derived(data?.cursorIndex ?? 0);
	const current = $derived(data?.states[cursor]);
	const percent = $derived(
		data ? Math.round((data.progress.passed / data.progress.total) * 100) : 0
	);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/session/${sessionId}`);
			if (!res.ok) {
				const json = await res.json().catch(() => ({}));
				throw new Error(json.message ?? json.error ?? `Could not load session (${res.status})`);
			}
			const json = await res.json();
			if (!hasCredentials(sessionId)) {
				await goto(`/workshop/${sessionId}/setup`);
				return;
			}
			if (json.blinkAt) lastBlinkAt = json.blinkAt;
			data = json;
			await scrollActiveIntoView();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	}

	async function pollSession() {
		const res = await fetch(`/api/session/${sessionId}`);
		if (!res.ok) return;
		const json = await res.json();
		if (json.blinkAt && json.blinkAt !== lastBlinkAt) {
			lastBlinkAt = json.blinkAt;
			clearStuckRevokeTimer();
			triggerBlink();
		}
		if (data) {
			const wasStuck = data.stuckAt;
			data = { ...data, stuckAt: json.stuckAt, blinkAt: json.blinkAt };
			if (wasStuck && !json.stuckAt) clearStuckRevokeTimer();
		}
	}

	function triggerBlink() {
		showBlink = true;
		setTimeout(() => {
			showBlink = false;
		}, 2000);
	}

	function clearStuckRevokeTimer() {
		if (stuckRevokeTimer) {
			clearTimeout(stuckRevokeTimer);
			stuckRevokeTimer = undefined;
		}
	}

	async function revokeStuck() {
		clearStuckRevokeTimer();
		if (!data?.stuckAt) return;
		try {
			const res = await fetch(`/api/session/${sessionId}/stuck`, { method: 'DELETE' });
			if (res.ok && data) {
				data = { ...data, stuckAt: null };
			}
		} catch {
			// ignore
		}
	}

	function scheduleStuckRevoke() {
		clearStuckRevokeTimer();
		stuckRevokeTimer = setTimeout(() => {
			void revokeStuck();
		}, STUCK_REVOKE_MS);
	}

	async function signalStuck() {
		if (!data) return;

		if (data.stuckAt) {
			await revokeStuck();
			return;
		}

		stuckLoading = true;
		try {
			const res = await fetch(`/api/session/${sessionId}/stuck`, { method: 'POST' });
			if (!res.ok) return;
			const json = await res.json();
			data = { ...data, stuckAt: json.stuckAt };
			scheduleStuckRevoke();
		} finally {
			stuckLoading = false;
		}
	}

	async function selectStep(index: number) {
		if (!data || index < 0 || index >= data.states.length) return;
		await fetch(`/api/session/${sessionId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cursorIndex: index })
		});
		data = { ...data, cursorIndex: index };
		await refreshGuide();
		await scrollActiveIntoView();
	}

	async function scrollActiveIntoView() {
		await tick();
		stepListEl?.querySelector('.step-item.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function goPrev() {
		if (data && cursor > 0) void selectStep(cursor - 1);
	}

	function goNext() {
		if (data && cursor < data.states.length - 1) void selectStep(cursor + 1);
	}

	function onKeydown(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			goNext();
		}
	}

	async function refreshGuide() {
		const res = await fetch(`/api/session/${sessionId}`);
		if (res.ok) {
			const json = await res.json();
			data = json;
		}
	}

	async function verify() {
		if (!current || current.kind !== 'verifiable') return;
		const credentials = getCredentials(sessionId);
		if (!credentials) {
			await goto(`/workshop/${sessionId}/setup`);
			return;
		}
		actionLoading = true;
		try {
			const res = await fetch(`/api/session/${sessionId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ stepId: current.id, credentials })
			});
			const json = await res.json();
			if (!res.ok) {
				error = json.error ?? 'Verification failed';
				return;
			}
			await load();
		} finally {
			actionLoading = false;
		}
	}

	async function markDone() {
		if (!current || current.kind !== 'guide') return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/session/${sessionId}/mark`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ stepId: current.id })
			});
			if (!res.ok) return;
			await load();
		} finally {
			actionLoading = false;
		}
	}

	function badgeClass(st: StepRow): string {
		if (st.kind === 'verifiable' && st.status === 'pass') return 'badge badge-pass';
		if (st.kind === 'verifiable' && st.status === 'fail') return 'badge badge-fail';
		if (st.kind === 'guide' && st.marked) return 'badge badge-marked';
		return 'badge badge-pending';
	}

	function badgeText(st: StepRow): string {
		if (st.kind === 'verifiable' && st.status === 'pass') return '✓';
		if (st.kind === 'verifiable' && st.status === 'fail') return '✗';
		if (st.kind === 'guide' && st.marked) return '✓';
		return '·';
	}

	async function loadDoubts() {
		const res = await fetch(`/api/session/${sessionId}/doubts`);
		if (!res.ok) return;
		const json = await res.json();
		doubts = json.doubts ?? [];
	}

	async function openChat() {
		chatOpen = true;
		await loadDoubts();
	}

	function closeChat() {
		chatOpen = false;
		doubtError = '';
		cancelEditDoubt();
	}

	function startEditDoubt(doubt: Doubt) {
		editingDoubtId = doubt.id;
		editingDoubtMessage = doubt.message;
		doubtError = '';
	}

	function cancelEditDoubt() {
		editingDoubtId = null;
		editingDoubtMessage = '';
	}

	async function saveEditDoubt(doubtId: string) {
		const message = editingDoubtMessage.trim();
		if (!message) return;

		doubtActionId = doubtId;
		doubtError = '';
		try {
			const res = await fetch(`/api/session/${sessionId}/doubts/${doubtId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message })
			});
			const json = await res.json();
			if (!res.ok) {
				doubtError = json.message ?? json.error ?? 'Could not update your question';
				return;
			}
			doubts = doubts.map((d) => (d.id === doubtId ? json.doubt : d));
			cancelEditDoubt();
		} catch {
			doubtError = 'Could not update your question';
		} finally {
			doubtActionId = null;
		}
	}

	async function deleteDoubt(doubtId: string) {
		if (!confirm('Delete this question?')) return;

		doubtActionId = doubtId;
		doubtError = '';
		try {
			const res = await fetch(`/api/session/${sessionId}/doubts/${doubtId}`, { method: 'DELETE' });
			if (!res.ok) {
				const json = await res.json().catch(() => ({}));
				doubtError = json.message ?? json.error ?? 'Could not delete your question';
				return;
			}
			doubts = doubts.filter((d) => d.id !== doubtId);
			if (editingDoubtId === doubtId) cancelEditDoubt();
		} catch {
			doubtError = 'Could not delete your question';
		} finally {
			doubtActionId = null;
		}
	}

	async function submitDoubt() {
		const message = doubtMessage.trim();
		if (!message) return;

		doubtLoading = true;
		doubtError = '';
		try {
			const res = await fetch(`/api/session/${sessionId}/doubts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message })
			});
			const json = await res.json();
			if (!res.ok) {
				doubtError = json.message ?? json.error ?? 'Could not send your question';
				return;
			}
			doubtMessage = '';
			doubts = [json.doubt, ...doubts];
		} catch {
			doubtError = 'Could not send your question';
		} finally {
			doubtLoading = false;
		}
	}

	function fmtTime(d: string) {
		try {
			return new Date(d).toLocaleString();
		} catch {
			return d;
		}
	}

	async function onGuideClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('.code-copy-btn');
		if (!btn || !(btn instanceof HTMLButtonElement)) return;

		const wrap = btn.closest('.code-block-wrap');
		const code = wrap?.querySelector('code')?.textContent ?? '';
		if (!code) return;

		const original = btn.textContent ?? 'Copy';
		try {
			await navigator.clipboard.writeText(code);
			btn.textContent = 'Copied!';
			copyFeedback = 'Query copied to clipboard';
			setTimeout(() => {
				btn.textContent = original;
				copyFeedback = '';
			}, 1500);
		} catch {
			copyFeedback = 'Could not copy — select the query and copy manually';
		}
	}

	onMount(() => {
		load();
		pollTimer = setInterval(pollSession, 4000);
		return () => {
			if (pollTimer) clearInterval(pollTimer);
			clearStuckRevokeTimer();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="header">
	<div class="logo">ELASTIC <span>BANGALORE</span></div>
	<div style="display:flex;align-items:center;gap:1rem;font-size:0.9rem">
		{#if data}
			<span style="color:var(--muted)">Hi, <strong style="color:var(--text)">{data.participantName}</strong></span>
			<span>{data.progress.passed}/{data.progress.total} ({percent}%)</span>
		{/if}
		<a
			href="/workshop/{sessionId}/setup"
			class="btn btn-secondary"
			style="text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem"
		>Elastic setup</a>
		<a href="/" class="btn btn-secondary" style="text-decoration:none;font-size:0.8rem;padding:0.4rem 0.75rem"
			>Exit</a
		>
	</div>
</div>

{#if loading}
	<div class="container" style="padding:3rem;text-align:center;color:var(--muted)">Loading workshop…</div>
{:else if error}
	<div class="container"><div class="alert alert-error">{error}</div></div>
{:else if data?.complete}
	<div class="container" style="max-width:560px;padding-top:3rem;text-align:center">
		<div class="card">
			<h1 style="color:var(--success)">Workshop complete!</h1>
			<p>Great work, {data.participantName}. All steps verified.</p>
			<a href="/" class="btn btn-primary" style="text-decoration:none">Back to home</a>
		</div>
	</div>
{:else if data && current}
	<div style="padding:1rem">
		<div style="margin-bottom:0.75rem">
			<div class="progress-bar">
				<div class="progress-fill" style="width:{percent}%"></div>
			</div>
		</div>

		<div class="grid-2">
			<aside class="card" style="padding:0.75rem">
				<div class="step-nav-header">
					<h2 style="font-size:0.85rem;color:var(--muted);margin:0;padding:0 0.25rem">Steps</h2>
					<div class="step-nav-buttons">
						<button
							type="button"
							class="step-nav-btn"
							title="Previous step (↑)"
							disabled={cursor === 0}
							onclick={goPrev}
							aria-label="Previous step"
						>↑</button>
						<button
							type="button"
							class="step-nav-btn"
							title="Next step (↓)"
							disabled={cursor >= data.states.length - 1}
							onclick={goNext}
							aria-label="Next step"
						>↓</button>
					</div>
				</div>
				<ul class="step-list" bind:this={stepListEl}>
					{#each data.states as st, i}
						<li>
							<button
								type="button"
								class="step-item"
								class:active={i === cursor}
								style="width:100%;text-align:left;background:none;color:inherit"
								onclick={() => selectStep(i)}
							>
								<div class="module">{st.module}</div>
								<div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:start">
									<span class="label">{st.label}</span>
									<span class={badgeClass(st)}>{badgeText(st)}</span>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			</aside>

			<section class="card panel">
				<div style="margin-bottom:1rem">
					<div style="font-size:0.8rem;color:var(--muted)">{current.module}</div>
					<h2 style="margin:0.25rem 0 0">{current.label}</h2>
				</div>

				{#if current.download}
					<div class="step-download">
						<p>You'll need this dataset for this step:</p>
						<a
							class="btn btn-secondary step-download-btn"
							href={current.download.href}
							download
						>{current.download.label}</a>
					</div>
				{/if}

				<div class="markdown" role="presentation" onclick={onGuideClick}>
					{@html data.guideHtml}
				</div>

				{#if copyFeedback}
					<p class="copy-feedback">{copyFeedback}</p>
				{/if}

				<details style="margin-bottom:1rem">
					<summary style="cursor:pointer;color:var(--muted);font-size:0.9rem">Quick instructions</summary>
					<pre style="white-space:pre-wrap;font-size:0.85rem;margin-top:0.5rem">{current.instructions}</pre>
				</details>

				{#if current.reason}
					<div class={current.status === 'pass' || current.marked ? 'alert alert-success' : 'alert alert-error'}>
						{current.reason}
					</div>
				{/if}

				<div class="workshop-actions">
					{#if current.kind === 'verifiable'}
						<button class="btn btn-primary" disabled={actionLoading} onclick={verify}>
							{actionLoading ? 'Verifying…' : 'Verify step'}
						</button>
					{:else}
						<button class="btn btn-primary" disabled={actionLoading || current.marked} onclick={markDone}>
							{current.marked ? 'Acknowledged' : 'Mark as done'}
						</button>
					{/if}

					<div class="step-nav-inline">
						<button
							type="button"
							class="btn btn-secondary step-nav-btn-wide"
							disabled={cursor === 0}
							onclick={goPrev}
						>↑ Previous</button>
						<button
							type="button"
							class="btn btn-secondary step-nav-btn-wide"
							disabled={cursor >= data.states.length - 1}
							onclick={goNext}
						>Next ↓</button>
					</div>
				</div>

				<p class="workshop-hint">↑ ↓ navigate · click <strong>Copy ES|QL</strong> on query blocks</p>
			</section>
		</div>
	</div>

	<button
		type="button"
		class="chat-fab"
		onclick={openChat}
		title="Ask a question"
		aria-label="Open chat to ask a question"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	</button>

	<button
		type="button"
		class="stuck-fab"
		class:waiting={!!data.stuckAt}
		disabled={stuckLoading}
		onclick={signalStuck}
		title={data.stuckAt ? 'Click to cancel · auto-cancels in 5s' : 'Signal that you need help'}
	>
		{#if data.stuckAt}
			Waiting for help… (tap to cancel)
		{:else}
			{stuckLoading ? 'Sending…' : "I'm stuck"}
		{/if}
	</button>
{/if}

{#if showBlink}
	<div class="blink-overlay">
		<div class="blink-message">Help is on the way!</div>
	</div>
{/if}

{#if chatOpen}
	<div class="chat-backdrop" role="presentation" onclick={closeChat}></div>
	<aside class="chat-sidebar" aria-label="Ask a question">
		<div class="chat-sidebar-header">
			<h2>Ask a question</h2>
			<button type="button" class="chat-close-btn" onclick={closeChat} aria-label="Close chat">✕</button>
		</div>

		<div class="chat-messages">
			{#if doubts.length === 0}
				<p class="chat-empty">No questions yet. Type your doubt below and we'll see it in the admin panel.</p>
			{:else}
				{#each doubts as doubt (doubt.id)}
					<div class="chat-bubble">
						{#if editingDoubtId === doubt.id}
							<textarea
								class="chat-edit-input"
								bind:value={editingDoubtMessage}
								maxlength="2000"
								disabled={doubtActionId === doubt.id}
							></textarea>
							<div class="chat-bubble-actions">
								<button
									type="button"
									class="chat-text-btn"
									disabled={doubtActionId === doubt.id}
									onclick={cancelEditDoubt}
								>Cancel</button>
								<button
									type="button"
									class="chat-text-btn primary"
									disabled={doubtActionId === doubt.id || !editingDoubtMessage.trim()}
									onclick={() => saveEditDoubt(doubt.id)}
								>
									{doubtActionId === doubt.id ? 'Saving…' : 'Save'}
								</button>
							</div>
						{:else}
							{doubt.message}
							<div class="chat-bubble-footer">
								<time datetime={doubt.createdAt}>{fmtTime(doubt.createdAt)}</time>
								<div class="chat-bubble-actions">
									<button
										type="button"
										class="chat-text-btn"
										disabled={doubtActionId === doubt.id}
										onclick={() => startEditDoubt(doubt)}
									>Edit</button>
									<button
										type="button"
										class="chat-text-btn danger"
										disabled={doubtActionId === doubt.id}
										onclick={() => deleteDoubt(doubt.id)}
									>
										{doubtActionId === doubt.id ? '…' : 'Delete'}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<form
			class="chat-compose"
			onsubmit={(e) => {
				e.preventDefault();
				void submitDoubt();
			}}
		>
			<textarea
				bind:value={doubtMessage}
				placeholder="What's your doubt?"
				maxlength="2000"
				disabled={doubtLoading}
			></textarea>
			{#if doubtError}
				<div class="alert alert-error" style="margin:0;padding:0.5rem 0.75rem;font-size:0.85rem">{doubtError}</div>
			{/if}
			<div class="chat-compose-actions">
				<button class="btn btn-primary" type="submit" disabled={doubtLoading || !doubtMessage.trim()}>
					{doubtLoading ? 'Sending…' : 'Send'}
				</button>
			</div>
		</form>
	</aside>
{/if}
