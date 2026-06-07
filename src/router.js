// Pet Help — Hash-based SPA Router
const routes = {};
let currentRoute = null;
let beforeNavigateHook = null;

export function registerRoute(path, handler) {
  // Convert :param patterns to regex
  const paramNames = [];
  const regexStr = path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes[path] = { handler, regex: new RegExp(`^${regexStr}$`), paramNames };
}

export function navigate(path) {
  if (beforeNavigateHook && !beforeNavigateHook(path)) return;
  window.location.hash = path;
}

export function goBack() {
  window.history.back();
}

function matchRoute(hash) {
  const path = hash.replace('#', '') || '/web';
  
  for (const [routePath, route] of Object.entries(routes)) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      // Parse query string
      const queryStr = path.split('?')[1] || '';
      const query = {};
      if (queryStr) {
        queryStr.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          query[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      }
      return { handler: route.handler, params, query, path: routePath };
    }
  }
  return null;
}

export function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash || '#/web';
    const cleanHash = hash.split('?')[0];
    const queryStr = hash.split('?')[1] || '';
    
    // Try exact match first
    let matched = null;
    for (const [routePath, route] of Object.entries(routes)) {
      const testPath = cleanHash.replace('#', '');
      const match = testPath.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        const query = {};
        if (queryStr) {
          queryStr.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            query[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });
        }
        matched = { handler: route.handler, params, query, path: routePath };
        break;
      }
    }
    
    if (matched) {
      if (beforeNavigateHook && !beforeNavigateHook(matched.path)) return;
      currentRoute = matched;
      matched.handler(matched.params, matched.query);
    } else {
      // 404 fallback
      navigate('/web');
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function getCurrentRoute() {
  return currentRoute;
}

export function setBeforeNavigate(hook) {
  beforeNavigateHook = hook;
}
