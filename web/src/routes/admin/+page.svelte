<script lang="ts">
	import { onMount } from 'svelte';
	import { MODULE_ORDER } from '$lib/steps';

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
	let activeTab = $state<'progress' | 'questions'>('progress');
	let activeModuleIndex = $state(0);
	let refreshing = $state(false);
	let doubtsPollTimer: ReturnType<typeof setInterval> | undefined;
	const DOUBTS_POLL_MS = 5000;

	const moduleRosters = $derived(buildModuleRosters(participants));
	const activeRoster = $derived(moduleRosters[activeModuleIndex] ?? null);

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

	onMount(() => {
		if (data.authed) {
			void loadParticipants();
			void loadDoubts();
			doubtsPollTimer = setInterval(() => {
				void loadDoubts();
			}, DOUBTS_POLL_MS);
		}
		return () => {
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
	<a href="/" class="btn btn-secondary" style="text-decoration:none;font-size:0.875rem">Home</a>
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
			<p style="font-size:0.8rem;color:var(--muted);margin:1rem 0 0">
				Set <code>ADMIN_PASSWORD</code> in your environment.
			</p>
		</div>
	{:else}
		<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
			<div>
				<h1 style="margin:0">Workshop admin</h1>
				<p style="color:var(--muted);margin:0.25rem 0 0">
					{participants.length} participants · {doubts.length} questions · questions refresh every 5s
				</p>
			</div>
			<div style="display:flex;gap:0.5rem;align-items:center">
				<button class="btn btn-primary" type="button" disabled={refreshing} onclick={refreshProgress}>
					{refreshing ? 'Refreshing…' : 'Refresh progress'}
				</button>
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
									<time class="doubt-card-time" datetime={doubt.createdAt}>{fmt(doubt.createdAt)}</time>
								</div>
								<p class="doubt-card-message">{doubt.message}</p>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	{/if}
</main>
