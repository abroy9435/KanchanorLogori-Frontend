export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent);

export const isInStandaloneMode = () =>
  ('standalone' in window.navigator) && window.navigator.standalone;

export const isWebView = () =>
  window.self !== window.top;

export const isPrivateSafari = () => {
  try {
    window.sessionStorage.setItem("__test", "1");
    window.sessionStorage.removeItem("__test");
    return false;
  } catch {
    return true; // sessionStorage blocked → private mode or storage partitioned
  }
};
