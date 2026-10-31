// Google tag (gtag.js) for Google Ads, behind consent (Google Consent Mode v2, "basic" mode).
// Nothing is loaded from Google and no advertising cookies are set until the visitor clicks "Accept".
(function () {
  var TAG_ID = 'AW-970610553';
  var STORAGE_KEY = 'investireland_cookie_consent_v1';
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('consent', 'default', DENIED);
  gtag('set', 'ads_data_redaction', true);
  gtag('js', new Date());
  gtag('config', TAG_ID);

  var loaded = false;
  function loadTag() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + TAG_ID;
    document.head.appendChild(s);
  }

  function read() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function apply(choice) {
    if (choice === 'granted') {
      gtag('consent', 'update', GRANTED);
      gtag('set', 'ads_data_redaction', false);
      loadTag();
    } else {
      gtag('consent', 'update', DENIED);
      gtag('set', 'ads_data_redaction', true);
    }
  }

  window.investIrelandConsent = {
    get: read,
    set: function (choice) {
      if (choice !== 'granted' && choice !== 'denied') return;
      try {
        window.localStorage.setItem(STORAGE_KEY, choice);
      } catch (e) {
        /* storage blocked: the choice applies to this page only */
      }
      apply(choice);
      window.dispatchEvent(new CustomEvent('investireland:consent', { detail: choice }));
    },
    open: function () {
      window.dispatchEvent(new CustomEvent('investireland:consent-open'));
    },
  };

  var saved = read();
  if (saved) apply(saved);
})();
