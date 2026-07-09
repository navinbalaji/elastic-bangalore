export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["images/image-1.png","images/image-10.png","images/image-11.png","images/image-12.png","images/image-13.png","images/image-14.png","images/image-15.png","images/image-16.png","images/image-17.png","images/image-18.png","images/image-19.png","images/image-2.png","images/image-20.png","images/image-21.png","images/image-22.png","images/image-23.png","images/image-24.png","images/image-25.png","images/image-26.png","images/image-27.png","images/image-28.png","images/image-29.png","images/image-3.png","images/image-30.png","images/image-31.png","images/image-32.png","images/image-33.png","images/image-34.png","images/image-35.png","images/image-36.png","images/image-37.png","images/image-38.png","images/image-39.png","images/image-4.png","images/image-40.png","images/image-41.png","images/image-42.png","images/image-43.png","images/image-44.png","images/image-45.png","images/image-46.png","images/image-47.png","images/image-48.png","images/image-49.png","images/image-5.png","images/image-50.png","images/image-51.png","images/image-52.png","images/image-53.png","images/image-54.png","images/image-6.png","images/image-7.png","images/image-8.png","images/image-9.png","images/image.png","images/image12.gif","lab-guide.md"]),
	mimeTypes: {".png":"image/png",".gif":"image/gif",".md":"text/markdown"},
	_: {
		client: {start:"_app/immutable/entry/start.hmcxLCxm.js",app:"_app/immutable/entry/app.CKr2rpzs.js",imports:["_app/immutable/entry/start.hmcxLCxm.js","_app/immutable/chunks/BDg7tD3J.js","_app/immutable/chunks/1y-_6oB9.js","_app/immutable/chunks/CuptgcrW.js","_app/immutable/chunks/DsBketEV.js","_app/immutable/entry/app.CKr2rpzs.js","_app/immutable/chunks/1y-_6oB9.js","_app/immutable/chunks/xPE5xD44.js","_app/immutable/chunks/Dq2AAGkP.js","_app/immutable/chunks/DsBketEV.js","_app/immutable/chunks/cuytnhZq.js","_app/immutable/chunks/26J-EZ4K.js","_app/immutable/chunks/CNHio2Y9.js","_app/immutable/chunks/D6BERlYk.js","_app/immutable/chunks/CuptgcrW.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/admin/doubts",
				pattern: /^\/api\/admin\/doubts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/doubts/_server.ts.js'))
			},
			{
				id: "/api/admin/login",
				pattern: /^\/api\/admin\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/login/_server.ts.js'))
			},
			{
				id: "/api/admin/participants",
				pattern: /^\/api\/admin\/participants\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/participants/_server.ts.js'))
			},
			{
				id: "/api/admin/participants/[sessionId]/blink",
				pattern: /^\/api\/admin\/participants\/([^/]+?)\/blink\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/participants/_sessionId_/blink/_server.ts.js'))
			},
			{
				id: "/api/join",
				pattern: /^\/api\/join\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/join/_server.ts.js'))
			},
			{
				id: "/api/resume",
				pattern: /^\/api\/resume\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/resume/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]",
				pattern: /^\/api\/session\/([^/]+?)\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]/credentials",
				pattern: /^\/api\/session\/([^/]+?)\/credentials\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/credentials/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]/doubts",
				pattern: /^\/api\/session\/([^/]+?)\/doubts\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/doubts/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]/mark",
				pattern: /^\/api\/session\/([^/]+?)\/mark\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/mark/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]/stuck",
				pattern: /^\/api\/session\/([^/]+?)\/stuck\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/stuck/_server.ts.js'))
			},
			{
				id: "/api/session/[sessionId]/verify",
				pattern: /^\/api\/session\/([^/]+?)\/verify\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/session/_sessionId_/verify/_server.ts.js'))
			},
			{
				id: "/workshop/[sessionId]",
				pattern: /^\/workshop\/([^/]+?)\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/workshop/[sessionId]/setup",
				pattern: /^\/workshop\/([^/]+?)\/setup\/?$/,
				params: [{"name":"sessionId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
