<script lang="ts">
	import { onMount } from 'svelte';
	import { MODULE_ORDER } from '$lib/steps';
	import HeaderGithubLink from '$lib/components/HeaderGithubLink.svelte';

	type ModuleStep = {
		id: string;
		label: string;
		kind: string;
		status: string;
		reason: string;
	};

	type Module = {
		module: string;
		shortName: string;
		passed: number;
		total: number;
		percent: number;
		complete: boolean;
		hasFailed: boolean;
		steps: ModuleStep[];
	};

	type Doubt = {
		id: string;
		message: string;
		reply: string | null;
		repliedAt: string | null;
		createdAt: string;
		sessionId: string;
		participantName: string;
		userKey: string;
	};

	type Participant = {
		sessionId: string;
		userKey: string;
		name: string;
		percent: number;
		progress: { passed: number; total: number };
		modules: Module[];
		complete: boolean;
		currentStep: string;
		currentModule: string;
		failedSteps: { id: string; label: string; reason: string }[];
		lastSeenAt: string;
		joinedAt: string;
		stuckAt: string | null;
	};

	type RosterEntry = {
		sessionId: string;
		name: string;
		userKey: string;
		passed: number;
		total: number;
		percent: number;
		complete: boolean;
		hasFailed: boolean;
		inProgress: boolean;
		stuckAt: string | null;
	};

	type ModuleRoster = {
		module: string;
		shortName: string;
		complete: RosterEntry[];
		inProgress: RosterEntry[];
		notStarted: RosterEntry[];
		failed: RosterEntry[];
	};

	let { data } = $props();

	let password = $state('');
	let loginError = $state('');
	let loading = $state(false);
	let participants = $state<Participant[]>([]);
	let doubts = $state<Doubt[]>([]);
	let blinking = $state<Record<string, boolean>>({});
	let dismissing = $state<Record<string, boolean>>({});
	let activeTab = $state<'progress' | 'stuck' | 'questions'>('progress');
	let activeModuleIndex = $state(0);
	let refreshing = $state(false);
	let resetModalOpen = $state(false);
	let resetPassword = $state('');
	let resetLoading = $state(false);
	let resetError = $state('');
	let resetSuccess = $state('');
	let editingDoubtId = $state<string | null>(null);
	let editingDoubtMessage = $state('');
	let replyingDoubtId = $state<string | null>(null);
	let replyingMessage = $state('');
	let doubtActionId = $state<string | null>(null);
	let doubtsPollTimer: ReturnType<typeof setInterval> | undefined;
	let participantsPollTimer: ReturnType<typeof setInterval> | undefined;
	const DOUBTS_POLL_MS = 5000;
	const PARTICIPANTS_POLL_MS = 5000;

	const moduleRosters = $derived(buildModuleRosters(participants));
	const activeRoster = $derived(moduleRosters[activeModuleIndex] ?? null);
	const stuckParticipants = $derived(
		participants
			.filter((p) => p.stuckAt)
			.sort((a, b) => new Date(b.stuckAt!).getTime() - new Date(a.stuckAt!).getTime())
	);

	function buildModuleRosters(list: Participant[]): ModuleRoster[] {
		return MODULE_ORDER.map((moduleName, index) => {
			const shortName = moduleName.split(' — ')[0] ?? moduleName;
			const complete: RosterEntry[] = [];
			const inProgress: RosterEntry[] = [];
			const notStarted: RosterEntry[] = [];
			const failed: RosterEntry[] = [];

			for (const p of list) {
				const mod = p.modules[index];
				if (!mod) continue;

				const entry: RosterEntry = {
					sessionId: p.sessionId,
					name: p.name,
					userKey: p.userKey,
					passed: mod.passed,
					total: mod.total,
					percent: mod.percent,
					complete: mod.complete,
					hasFailed: mod.hasFailed,
					inProgress: mod.passed > 0 && !mod.complete && !mod.hasFailed,
					stuckAt: p.stuckAt
				};

				if (mod.hasFailed) failed.push(entry);
				else if (mod.complete) complete.push(entry);
				else if (mod.passed > 0) inProgress.push(entry);
				else notStarted.push(entry);
			}

			const sortByStuckThenName = (a: RosterEntry, b: RosterEntry) => {
				if (a.stuckAt && !b.stuckAt) return -1;
				if (!a.stuckAt && b.stuckAt) return 1;
				return a.name.localeCompare(b.name);
			};

			complete.sort(sortByStuckThenName);
			inProgress.sort((a, b) => {
				if (a.stuckAt && !b.stuckAt) return -1;
				if (!a.stuckAt && b.stuckAt) return 1;
				return b.percent - a.percent || a.name.localeCompare(b.name);
			});
			notStarted.sort(sortByStuckThenName);
			failed.sort(sortByStuckThenName);

			return { module: moduleName, shortName, complete, inProgress, notStarted, failed };
		});
	}

	async function login() {
		loginError = '';
		loading = true;
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			if (!res.ok) {
				const json = await res.json();
				loginError = json.error ?? 'Login failed';
				return;
			}
			location.reload();
		} finally {
			loading = false;
		}
	}

	async function loadDoubts() {
		const res = await fetch('/api/admin/doubts');
		if (!res.ok) return;
		const json = await res.json();
		doubts = json.doubts ?? [];
	}

	async function loadParticipants() {
		const res = await fetch('/api/admin/participants');
		if (!res.ok) return;
		const json = await res.json();
		participants = json.participants;
	}

	async function blinkParticipant(sessionId: string) {
		blinking[sessionId] = true;
		try {
			const res = await fetch(`/api/admin/participants/${sessionId}/blink`, { method: 'POST' });
			if (res.ok) await loadParticipants();
		} finally {
			blinking[sessionId] = false;
		}
	}

	async function dismissStuck(sessionId: string) {
		dismissing[sessionId] = true;
		try {
			const res = await fetch(`/api/admin/participants/${sessionId}/stuck`, { method: 'DELETE' });
			if (res.ok) await loadParticipants();
		} finally {
			dismissing[sessionId] = false;
		}
	}

	async function refreshProgress() {
		refreshing = true;
		try {
			await loadParticipants();
		} finally {
			refreshing = false;
		}
	}

	async function logout() {
		await fetch('/api/admin/login', { method: 'DELETE' });
		location.reload();
	}

	function openResetModal() {
		resetPassword = '';
		resetError = '';
		resetSuccess = '';
		resetModalOpen = true;
	}

	function closeResetModal() {
		if (resetLoading) return;
		resetModalOpen = false;
		resetPassword = '';
		resetError = '';
	}

	async function deleteAllEntries() {
		resetError = '';
		resetSuccess = '';
		resetLoading = true;
		try {
			const res = await fetch('/api/admin/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: resetPassword })
			});
			const json = await res.json();
			if (!res.ok) {
				resetError = json.error ?? 'Could not delete entries';
				return;
			}
			resetSuccess = 'All workshop data deleted.';
			participants = [];
			doubts = [];
			setTimeout(() => {
				closeResetModal();
				resetSuccess = '';
			}, 1500);
		} catch {
			resetError = 'Network error';
		} finally {
			resetLoading = false;
		}
	}

	function startEditDoubt(doubt: Doubt) {
		cancelReplyDoubt();
		editingDoubtId = doubt.id;
		editingDoubtMessage = doubt.message;
	}

	function cancelEditDoubt() {
		editingDoubtId = null;
		editingDoubtMessage = '';
	}

	function startReplyDoubt(doubt: Doubt) {
		cancelEditDoubt();
		replyingDoubtId = doubt.id;
		replyingMessage = doubt.reply ?? '';
	}

	function cancelReplyDoubt() {
		replyingDoubtId = null;
		replyingMessage = '';
	}

	async function saveReplyDoubt(doubtId: string) {
		const reply = replyingMessage.trim();
		if (!reply) return;

		doubtActionId = doubtId;
		try {
			const res = await fetch(`/api/admin/doubts/${doubtId}/reply`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reply })
			});
			const json = await res.json();
			if (!res.ok) return;
			doubts = doubts.map((d) => (d.id === doubtId ? json.doubt : d));
			cancelReplyDoubt();
		} finally {
			doubtActionId = null;
		}
	}

	async function saveEditDoubt(doubtId: string) {
		const message = editingDoubtMessage.trim();
		if (!message) return;

		doubtActionId = doubtId;
		try {
			const res = await fetch(`/api/admin/doubts/${doubtId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message })
			});
			const json = await res.json();
			if (!res.ok) return;
			doubts = doubts.map((d) => (d.id === doubtId ? json.doubt : d));
			cancelEditDoubt();
		} finally {
			doubtActionId = null;
		}
	}

	async function deleteDoubt(doubtId: string) {
		if (!confirm('Delete this question?')) return;

		doubtActionId = doubtId;
		try {
			const res = await fetch(`/api/admin/doubts/${doubtId}`, { method: 'DELETE' });
			if (!res.ok) return;
			doubts = doubts.filter((d) => d.id !== doubtId);
			if (editingDoubtId === doubtId) cancelEditDoubt();
			if (replyingDoubtId === doubtId) cancelReplyDoubt();
		} finally {
			doubtActionId = null;
		}
	}

	onMount(() => {
		if (data.authed) {
			void loadParticipants();
			void loadDoubts();
			participantsPollTimer = setInterval(() => {
				void loadParticipants();
			}, PARTICIPANTS_POLL_MS);
			doubtsPollTimer = setInterval(() => {
				void loadDoubts();
			}, DOUBTS_POLL_MS);
		}
		return () => {
			if (participantsPollTimer) clearInterval(participantsPollTimer);
			if (doubtsPollTimer) clearInterval(doubtsPollTimer);
		};
	});

	function fmt(d: string) {
		try {
			return new Date(d).toLocaleString();
		} catch {
			return d;
		}
	}
</script>

<div class="header">
	<div class="logo">ELASTIC <span>BANGALORE</span> — Admin</div>
	<div class="header-actions">
		<HeaderGithubLink />
		<a href="/" class="btn btn-secondary" style="text-decoration:none;font-size:0.875rem">Home</a>
	</div>
</div>

<main class="container" style="padding-top:2rem;max-width:1400px">
	{#if !data.authed}
		<div class="card" style="max-width:400px;margin:0 auto">
			<h1 style="margin:0 0 1rem;font-size:1.25rem">Admin login</h1>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					login();
				}}
			>
				<label class="label" for="pw">Password</label>
				<input id="pw" class="input" type="password" bind:value={password} required />
				{#if loginError}
					<div class="alert alert-error" style="margin-top:0.75rem">{loginError}</div>
				{/if}
				<button class="btn btn-primary" type="submit" disabled={loading} style="margin-top:1rem">
					{loading ? '…' : 'Login'}
				</button>
			</form>
		</div>
	{:else}
		<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
			<div>
				<h1 style="margin:0">Workshop admin</h1>
				<p style="color:var(--muted);margin:0.25rem 0 0">
					{participants.length} participants · {stuckParticipants.length} stuck · {doubts.length}
					questions · auto-refresh every 5s
				</p>
			</div>
			<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
				<button class="btn btn-primary" type="button" disabled={refreshing} onclick={refreshProgress}>
					{refreshing ? 'Refreshing…' : 'Refresh progress'}
				</button>
				<button class="btn btn-danger" type="button" onclick={openResetModal}>Delete all entries</button>
				<button class="btn btn-secondary" onclick={logout}>Logout</button>
			</div>
		</div>

		<div class="admin-tabs" role="tablist">
			<button
				type="button"
				class="admin-tab"
				class:active={activeTab === 'progress'}
				role="tab"
				aria-selected={activeTab === 'progress'}
				onclick={() => (activeTab = 'progress')}
			>
				Module progress
			</button>
			<button
				type="button"
				class="admin-tab"
				class:active={activeTab === 'stuck'}
				role="tab"
				aria-selected={activeTab === 'stuck'}
				onclick={() => (activeTab = 'stuck')}
			>
				I'm stuck
				{#if stuckParticipants.length > 0}
					<span class="admin-tab-badge stuck">{stuckParticipants.length}</span>
				{/if}
			</button>
			<button
				type="button"
				class="admin-tab"
				class:active={activeTab === 'questions'}
				role="tab"
				aria-selected={activeTab === 'questions'}
				onclick={() => (activeTab = 'questions')}
			>
				Questions
				{#if doubts.length > 0}
					<span class="admin-tab-badge">{doubts.length}</span>
				{/if}
			</button>
		</div>

		{#if activeTab === 'progress'}
			{#if participants.length === 0}
				<div class="card" style="text-align:center;color:var(--muted);padding:3rem">
					No participants yet
				</div>
			{:else if activeRoster}
				<div class="module-tabs" role="tablist" aria-label="Workshop modules">
					{#each moduleRosters as roster, i}
						<button
							type="button"
							class="module-tab"
							class:active={activeModuleIndex === i}
							role="tab"
							aria-selected={activeModuleIndex === i}
							onclick={() => (activeModuleIndex = i)}
						>
							{roster.shortName}
							<span style="opacity:0.7">({roster.complete.length}/{participants.length})</span>
						</button>
					{/each}
				</div>

				<section class="module-roster">
					<div class="module-roster-header">
						<div>
							<h2>{activeRoster.module}</h2>
							<p style="margin:0.35rem 0 0;font-size:0.85rem;color:var(--muted)">
								Who has completed this module and who is still working on it
							</p>
						</div>
						<div class="module-roster-stats">
							<span class="roster-stat complete">{activeRoster.complete.length} completed</span>
							<span class="roster-stat in-progress">{activeRoster.inProgress.length} in progress</span>
							<span class="roster-stat not-started">{activeRoster.notStarted.length} not started</span>
							{#if activeRoster.failed.length > 0}
								<span class="roster-stat failed">{activeRoster.failed.length} failed</span>
							{/if}
						</div>
					</div>

					<div class="roster-groups">
						<div class="roster-group complete">
							<h3 class="roster-group-title">Completed ({activeRoster.complete.length})</h3>
							{#if activeRoster.complete.length === 0}
								<p class="roster-empty">No one has completed this module yet</p>
							{:else}
								<div class="roster-names">
									{#each activeRoster.complete as entry (entry.sessionId)}
										<div class="roster-name-row" class:stuck={!!entry.stuckAt}>
											<span class="roster-name">{entry.name}</span>
											<span class="roster-name-meta">{entry.passed}/{entry.total}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="roster-group in-progress">
							<h3 class="roster-group-title">In progress ({activeRoster.inProgress.length})</h3>
							{#if activeRoster.inProgress.length === 0}
								<p class="roster-empty">No one is currently on this module</p>
							{:else}
								<div class="roster-names">
									{#each activeRoster.inProgress as entry (entry.sessionId)}
										<div class="roster-name-row" class:stuck={!!entry.stuckAt}>
											<div>
												<div class="roster-name" class:stuck-blink={!!entry.stuckAt}>{entry.name}</div>
												{#if entry.stuckAt}
													<div style="font-size:0.72rem;color:var(--warning);margin-top:0.15rem">Needs help</div>
												{/if}
											</div>
											<div style="display:flex;align-items:center;gap:0.4rem">
												<span class="roster-name-meta">{entry.passed}/{entry.total} · {entry.percent}%</span>
												{#if entry.stuckAt}
													<button
														type="button"
														class="btn-blink"
														disabled={blinking[entry.sessionId]}
														onclick={() => blinkParticipant(entry.sessionId)}
													>
														{blinking[entry.sessionId] ? '…' : 'Blink'}
													</button>
													<button
														type="button"
														class="btn btn-secondary"
														style="font-size:0.7rem;padding:0.25rem 0.45rem"
														disabled={dismissing[entry.sessionId]}
														onclick={() => dismissStuck(entry.sessionId)}
													>
														{dismissing[entry.sessionId] ? '…' : 'Dismiss'}
													</button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="roster-group">
							<h3 class="roster-group-title">Not started ({activeRoster.notStarted.length})</h3>
							{#if activeRoster.notStarted.length === 0}
								<p class="roster-empty">Everyone has started this module</p>
							{:else}
								<div class="roster-names">
									{#each activeRoster.notStarted as entry (entry.sessionId)}
										<div class="roster-name-row" class:stuck={!!entry.stuckAt}>
											<span class="roster-name">{entry.name}</span>
											<span class="roster-name-meta">0/{entry.total}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						{#if activeRoster.failed.length > 0}
							<div class="roster-group failed">
								<h3 class="roster-group-title">Failed steps ({activeRoster.failed.length})</h3>
								<div class="roster-names">
									{#each activeRoster.failed as entry (entry.sessionId)}
										<div class="roster-name-row" class:stuck={!!entry.stuckAt}>
											<div>
												<div class="roster-name">{entry.name}</div>
												{#if entry.stuckAt}
													<div style="font-size:0.72rem;color:var(--warning);margin-top:0.15rem">Needs help</div>
												{/if}
											</div>
											<div style="display:flex;align-items:center;gap:0.4rem">
												<span class="roster-name-meta">{entry.passed}/{entry.total}</span>
												{#if entry.stuckAt}
													<button
														type="button"
														class="btn-blink"
														disabled={blinking[entry.sessionId]}
														onclick={() => blinkParticipant(entry.sessionId)}
													>
														{blinking[entry.sessionId] ? '…' : 'Blink'}
													</button>
													<button
														type="button"
														class="btn btn-secondary"
														style="font-size:0.7rem;padding:0.25rem 0.45rem"
														disabled={dismissing[entry.sessionId]}
														onclick={() => dismissStuck(entry.sessionId)}
													>
														{dismissing[entry.sessionId] ? '…' : 'Dismiss'}
													</button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}
		{:else if activeTab === 'stuck'}
			<section class="stuck-section">
				<div class="stuck-section-header">
					<p class="doubts-poll-hint">
						Participants who tapped <strong>I'm stuck</strong> in the workshop. Blink their screen to
						acknowledge, or dismiss when resolved. Auto-refresh every 5s.
					</p>
					<button
						class="btn btn-secondary"
						type="button"
						disabled={refreshing}
						onclick={refreshProgress}
					>
						{refreshing ? 'Refreshing…' : 'Refresh stuck'}
					</button>
				</div>
				{#if stuckParticipants.length === 0}
					<div class="card" style="text-align:center;color:var(--muted);padding:3rem">
						No one is stuck right now
					</div>
				{:else}
					<div class="admin-grid">
						{#each stuckParticipants as p (p.sessionId)}
							<article class="participant-card stuck">
								<div class="participant-header">
									<div>
										<div class="participant-name stuck-blink">
											{p.name}
											<span class="stuck-badge">Needs help</span>
										</div>
										<div style="font-size:0.8rem;color:var(--muted);margin-top:0.25rem">
											{p.currentModule} · {p.currentStep}
										</div>
										<div style="font-size:0.72rem;color:var(--muted);font-family:var(--font-mono);margin-top:0.2rem">
											{p.userKey.slice(0, 8)}…
										</div>
									</div>
									<div class="stuck-card-actions">
										<time
											class="stuck-card-time"
											datetime={p.stuckAt ?? undefined}
										>
											{p.stuckAt ? fmt(p.stuckAt) : ''}
										</time>
										<div class="stuck-card-buttons">
											<button
												type="button"
												class="btn-blink"
												disabled={blinking[p.sessionId] || dismissing[p.sessionId]}
												onclick={() => blinkParticipant(p.sessionId)}
											>
												{blinking[p.sessionId] ? '…' : 'Blink screen'}
											</button>
											<button
												type="button"
												class="btn-dismiss-stuck"
												disabled={dismissing[p.sessionId] || blinking[p.sessionId]}
												onclick={() => dismissStuck(p.sessionId)}
											>
												{dismissing[p.sessionId] ? '…' : 'Dismiss'}
											</button>
										</div>
									</div>
								</div>
								<div style="font-size:0.85rem;color:var(--muted)">
									Progress: {p.progress.passed}/{p.progress.total} ({p.percent}%)
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<section class="doubts-section">
				<p class="doubts-poll-hint">New questions appear automatically every 5 seconds.</p>
				{#if doubts.length === 0}
					<div class="card" style="text-align:center;color:var(--muted);padding:3rem">
						No questions yet
					</div>
				{:else}
					<div class="doubts-list">
						{#each doubts as doubt (doubt.id)}
							<article class="doubt-card">
								<div class="doubt-card-header">
									<div>
										<div class="doubt-card-name">{doubt.participantName}</div>
										<div style="font-size:0.72rem;color:var(--muted);font-family:var(--font-mono)">
											{doubt.userKey.slice(0, 8)}…
										</div>
									</div>
									<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end">
										<time class="doubt-card-time" datetime={doubt.createdAt}>{fmt(doubt.createdAt)}</time>
										{#if editingDoubtId !== doubt.id && replyingDoubtId !== doubt.id}
											<div class="doubt-card-actions">
												<button
													type="button"
													class="chat-text-btn primary"
													disabled={doubtActionId === doubt.id}
													onclick={() => startReplyDoubt(doubt)}
												>
													{doubt.reply ? 'Edit answer' : 'Answer'}
												</button>
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
										{/if}
									</div>
								</div>
								{#if editingDoubtId === doubt.id}
									<textarea
										class="chat-edit-input"
										bind:value={editingDoubtMessage}
										maxlength="2000"
										disabled={doubtActionId === doubt.id}
									></textarea>
									<div class="chat-bubble-actions" style="margin-top:0.5rem">
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
								{:else if replyingDoubtId === doubt.id}
									<p class="doubt-card-message">{doubt.message}</p>
									<label class="label" for="reply-{doubt.id}" style="margin-top:0.75rem;display:block">Your answer</label>
									<textarea
										id="reply-{doubt.id}"
										class="chat-edit-input"
										bind:value={replyingMessage}
										maxlength="2000"
										placeholder="Type your reply to the participant…"
										disabled={doubtActionId === doubt.id}
									></textarea>
									<div class="chat-bubble-actions" style="margin-top:0.5rem">
										<button
											type="button"
											class="chat-text-btn"
											disabled={doubtActionId === doubt.id}
											onclick={cancelReplyDoubt}
										>Cancel</button>
										<button
											type="button"
											class="chat-text-btn primary"
											disabled={doubtActionId === doubt.id || !replyingMessage.trim()}
											onclick={() => saveReplyDoubt(doubt.id)}
										>
											{doubtActionId === doubt.id ? 'Sending…' : 'Send answer'}
										</button>
									</div>
								{:else}
									<p class="doubt-card-message">{doubt.message}</p>
									{#if doubt.reply}
										<div class="doubt-card-reply">
											<div class="doubt-card-reply-label">Facilitator answer</div>
											<p class="doubt-card-reply-message">{doubt.reply}</p>
											{#if doubt.repliedAt}
												<time class="doubt-card-reply-time" datetime={doubt.repliedAt}>
													{fmt(doubt.repliedAt)}
												</time>
											{/if}
										</div>
									{/if}
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	{/if}
</main>

{#if resetModalOpen}
	<div class="admin-modal-backdrop" role="presentation" onclick={closeResetModal}></div>
	<div class="admin-modal" role="dialog" aria-labelledby="reset-title" aria-modal="true">
		<h2 id="reset-title" style="margin:0 0 0.5rem">Delete all workshop data?</h2>
		<p style="color:var(--muted);margin:0 0 1rem;font-size:0.9rem">
			This permanently removes all participants, sessions, progress, and questions. Enter the admin
			password to confirm.
		</p>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				void deleteAllEntries();
			}}
		>
			<label class="label" for="reset-password">Admin password</label>
			<input
				id="reset-password"
				class="input"
				type="password"
				bind:value={resetPassword}
				required
				autocomplete="current-password"
				disabled={resetLoading}
			/>
			{#if resetError}
				<div class="alert alert-error" style="margin-top:0.75rem">{resetError}</div>
			{/if}
			{#if resetSuccess}
				<div class="alert alert-success" style="margin-top:0.75rem">{resetSuccess}</div>
			{/if}
			<div class="admin-modal-actions">
				<button class="btn btn-secondary" type="button" disabled={resetLoading} onclick={closeResetModal}>
					Cancel
				</button>
				<button class="btn btn-danger" type="submit" disabled={resetLoading || !resetPassword.trim()}>
					{resetLoading ? 'Deleting…' : 'Delete all entries'}
				</button>
			</div>
		</form>
	</div>
{/if}
