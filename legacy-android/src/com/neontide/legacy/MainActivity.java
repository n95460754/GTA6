package com.neontide.legacy;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;

/** API-1 compatible host: loads the game from assets with ?legacy=1 and forwards the back key. */
public class MainActivity extends Activity {
    private WebView web;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html?legacy=1");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            web.loadUrl("javascript:window.NeonTide&&NeonTide.intent('back')");
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() { super.onPause(); web.loadUrl("javascript:window.NeonTide&&NeonTide.pause()"); }

    @Override
    protected void onResume() { super.onResume(); web.loadUrl("javascript:window.NeonTide&&NeonTide.resume()"); }
}
