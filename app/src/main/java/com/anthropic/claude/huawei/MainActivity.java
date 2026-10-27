package com.anthropic.claude.huawei;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.app.AlertDialog;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {

    private static final int SPLASH = Color.parseColor("#D97757");
    private WebView web;
    private volatile HttpURLConnection active;
    private volatile String activeId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setBackgroundDrawable(new ColorDrawable(SPLASH));
        w.setStatusBarColor(SPLASH);
        w.setNavigationBarColor(SPLASH);

        web = new WebView(this);
        web.setBackgroundColor(SPLASH);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                v.postDelayed(() -> v.evaluateJavascript(
                        "'v='+(window.__v||'old')+' files='+(window.__f||'-')+' scripts='+document.scripts.length+' init='+(window.__ok||'NO')",
                        val -> Toast.makeText(MainActivity.this, "JS: " + val, Toast.LENGTH_LONG).show()), 3000);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Toast.makeText(MainActivity.this, "JS error: " + m.message() + " (line " + m.lineNumber() + ")", Toast.LENGTH_LONG).show();
                }
                return true;
            }
            @Override
            public boolean onJsAlert(WebView v, String url, String message, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                        .setPositiveButton("OK", (dlg, which) -> r.confirm())
                        .setOnCancelListener(dlg -> r.cancel()).show();
                return true;
            }
            @Override
            public boolean onJsConfirm(WebView v, String url, String message, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                        .setPositiveButton("OK", (dlg, which) -> r.confirm())
                        .setNegativeButton("Cancel", (dlg, which) -> r.cancel())
                        .setOnCancelListener(dlg -> r.cancel()).show();
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        web.loadUrl("file:///android_asset/chat.html");
    }

    private void js(String fn, String id, String text) {
        final String code = "window." + fn + "(" + JSONObject.quote(id) + "," + JSONObject.quote(text) + ")";
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    private static String readAll(InputStream is) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        br.close();
        return sb.toString();
    }

    private class Bridge {

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void setBars(final boolean dark) {
            runOnUiThread(() -> {
                Window w = getWindow();
                int c = Color.parseColor(dark ? "#262624" : "#FAF9F5");
                w.setStatusBarColor(c);
                w.setNavigationBarColor(c);
                w.setBackgroundDrawable(new ColorDrawable(c));
                web.setBackgroundColor(c);
                if (Build.VERSION.SDK_INT >= 26) {
                    w.getDecorView().setSystemUiVisibility(dark ? 0
                            : (View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR));
                } else if (Build.VERSION.SDK_INT >= 23) {
                    w.getDecorView().setSystemUiVisibility(dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                }
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            try {
                if (url != null && url.startsWith("http")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void cancel(String id) {
            if (id != null && id.equals(activeId)) {
                activeId = null;
                final HttpURLConnection c = active;
                if (c != null) new Thread(c::disconnect).start();
            }
        }

        @JavascriptInterface
        public void send(final String id, final String apiKey, final String model, final String messagesJson) {
            activeId = id;
            new Thread(() -> {
                HttpURLConnection c = null;
                try {
                    JSONObject body = new JSONObject();
                    body.put("model", model);
                    body.put("max_tokens", 4096);
                    body.put("stream", true);
                    body.put("messages", new JSONArray(messagesJson));

                    c = (HttpURLConnection) new URL("https://api.anthropic.com/v1/messages").openConnection();
                    active = c;
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(120000);
                    c.setDoOutput(true);
                    c.setRequestProperty("content-type", "application/json");
                    c.setRequestProperty("x-api-key", apiKey);
                    c.setRequestProperty("anthropic-version", "2023-06-01");

                    OutputStream os = c.getOutputStream();
                    os.write(body.toString().getBytes("UTF-8"));
                    os.close();

                    int code = c.getResponseCode();
                    if (code >= 400) {
                        String msg = "Error " + code;
                        try {
                            JSONObject e = new JSONObject(readAll(c.getErrorStream())).optJSONObject("error");
                            if (e != null) msg = e.optString("message", msg);
                        } catch (Exception ignored) {}
                        js("onErr", id, msg);
                        return;
                    }

                    BufferedReader br = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
                    String line;
                    while ((line = br.readLine()) != null) {
                        if (!id.equals(activeId)) return;
                        if (!line.startsWith("data:")) continue;
                        String data = line.substring(5).trim();
                        if (data.isEmpty()) continue;
                        JSONObject j = new JSONObject(data);
                        String type = j.optString("type");
                        if ("content_block_delta".equals(type)) {
                            JSONObject d = j.optJSONObject("delta");
                            if (d != null && "text_delta".equals(d.optString("type"))) {
                                js("onDelta", id, d.optString("text"));
                            }
                        } else if ("error".equals(type)) {
                            JSONObject e = j.optJSONObject("error");
                            js("onErr", id, e != null ? e.optString("message", "Error") : "Error");
                            return;
                        } else if ("message_stop".equals(type)) {
                            break;
                        }
                    }
                    br.close();
                    if (id.equals(activeId)) js("onDone", id, "");
                } catch (Exception e) {
                    if (id.equals(activeId)) js("onErr", id, "Network error: " + e.getMessage());
                } finally {
                    if (c != null) c.disconnect();
                }
            }).start();
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onBack ? window.onBack() : false", value -> {
            if (!"true".equals(value)) finish();
        });
    }
}
