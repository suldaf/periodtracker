import * as React from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native'
import * as Linking from 'expo-linking'
import { WebView } from 'react-native-webview'

import { Screen } from '../../components/Screen'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '../../components/Text'
import { ScreenComponent } from '../../navigation/RootNavigator'
import { useColor } from '../../hooks/useColor'

const IOS_SAFARI_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'

const BLANK_PAGE_DETECTOR = `
  (function() {
    var send = function(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    };

    var report = function() {
      var bodyText = document.body && document.body.innerText ? document.body.innerText.trim() : '';
      var htmlLength = document.documentElement && document.documentElement.outerHTML
        ? document.documentElement.outerHTML.length
        : 0;

      send({
        type: 'page-inspect',
        textLength: bodyText.length,
        htmlLength: htmlLength,
        title: document.title || '',
        href: window.location.href || '',
      });
    };

    setTimeout(report, 600);
    setTimeout(report, 1800);
    document.addEventListener('DOMContentLoaded', report);
    window.addEventListener('load', report);
  })();
  true;
`

const LIVEWIRE_RESULT_BRIDGE = `
  (function() {
    if (window.__OKY_WEBVIEW_BRIDGE_INSTALLED__) {
      return;
    }
    window.__OKY_WEBVIEW_BRIDGE_INSTALLED__ = true;

    var post = function(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    };

    var safeSerialize = function(value) {
      try {
        return JSON.stringify(value);
      } catch (_e) {
        return null;
      }
    };

    document.addEventListener('submit', function() {
      post({ type: 'quiz-submit', href: window.location.href || '' });
    }, true);

    var originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = function() {
        var args = arguments;
        return originalFetch.apply(this, args).then(function(response) {
          try {
            var url = String(response && response.url ? response.url : '');
            if (url.indexOf('/livewire/update') >= 0) {
              response.clone().text().then(function(bodyText) {
                post({
                  type: 'livewire-update',
                  transport: 'fetch',
                  url: url,
                  status: response.status,
                  body: bodyText,
                });
              });
            }
          } catch (_e) {
            // no-op
          }

          return response;
        });
      };
    }

    var xhrOpen = XMLHttpRequest.prototype.open;
    var xhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      this.__okyUrl = url;
      return xhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('load', function() {
        try {
          var url = String(this.__okyUrl || '');
          if (url.indexOf('/livewire/update') >= 0) {
            post({
              type: 'livewire-update',
              transport: 'xhr',
              url: url,
              status: this.status,
              body: typeof this.responseText === 'string' ? this.responseText : safeSerialize(this.responseText),
            });
          }
        } catch (_e) {
          // no-op
        }
      });

      return xhrSend.apply(this, arguments);
    };
  })();
  true;
`

const QuizWebViewScreen: ScreenComponent<'QuizWebView'> = ({ navigation, route }) => {
  const { title, url } = route.params
  const { palette } = useColor()

  const normalizedUrl = React.useMemo(() => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    return `https://${url}`
  }, [url])

  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const [currentUrl, setCurrentUrl] = React.useState(normalizedUrl)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [lastResultSnippet, setLastResultSnippet] = React.useState<string | null>(null)
  const contentDetectedRef = React.useRef(false)

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title,
      // @ts-expect-error TODO: CustomStackNavigationOptions
      disableTranslate: true,
    })
  }, [navigation, title])

  const openInBrowser = () => {
    Linking.openURL(normalizedUrl)
  }

  const onShouldStartLoadWithRequest = (request: { url: string }) => {
    const isBootstrapRequest = request.url === 'about:blank' || request.url.startsWith('data:')
    if (isBootstrapRequest) {
      return true
    }

    const isHttpRequest = request.url.startsWith('http://') || request.url.startsWith('https://')
    if (!isHttpRequest) {
      Linking.openURL(request.url)
      return false
    }

    return true
  }

  const renderErrorState = () => {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle} enableTranslate={false}>
          Gagal membuka halaman
        </Text>
        {errorMessage ? (
          <Text style={styles.errorCaption} enableTranslate={false}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          onPress={openInBrowser}
          style={[styles.button, { backgroundColor: palette.secondary.base }]}
        >
          <Text style={styles.buttonText} enableTranslate={false}>
            Buka di browser
          </Text>
        </Pressable>
      </View>
    )
  }

  if (Platform.OS === 'web') {
    return (
      <Screen style={styles.centered}>
        <Text style={styles.errorTitle} enableTranslate={false}>
          Halaman ini dibuka lewat browser eksternal.
        </Text>
        <Pressable
          onPress={openInBrowser}
          style={[styles.button, { backgroundColor: palette.secondary.base }]}
        >
          <Text style={styles.buttonText} enableTranslate={false}>
            Buka link
          </Text>
        </Pressable>
      </Screen>
    )
  }
  const INJECTED_JS = `
  (function() {
    var hasPostedResult = false;

    function containsKeyword(text) {
      if (!text) {
        return false;
      }

      var normalizedText = String(text).toLowerCase();
      return (
        normalizedText.indexOf('hasil') >= 0 ||
        normalizedText.indexOf('kategori status gizi') >= 0
      );
    }

    function findScore() {
      if (hasPostedResult) {
        return;
      }

      const paragraphs = Array.from(document.querySelectorAll('p'));
      const labelElement = paragraphs.find(function (paragraph) {
        var text = paragraph && paragraph.innerText ? paragraph.innerText.trim() : '';
        return containsKeyword(text);
      });

      if (labelElement) {
        // 2. Ambil sibling berikutnya (elemen <p> yang berisi angka)
        const scoreElement = labelElement.nextElementSibling;
        
        if (scoreElement) {
          const scoreValue = scoreElement.innerText.trim();
          hasPostedResult = true;
          clearInterval(interval);
          
          // Kirim data ke React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SCORE_RESULT',
            score: scoreValue
          }));
        }
      }
    }

    // Jalankan pengecekan secara berkala (misal tiap 1 detik)
    const interval = setInterval(findScore, 1000);
    
    // Opsional: Berhenti mencari setelah beberapa lama untuk hemat baterai
    setTimeout(() => clearInterval(interval), 30000);
  })();
  true;
`

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {hasError ? (
        renderErrorState()
      ) : (
        <>
          <WebView
            source={{ uri: normalizedUrl }}
            style={styles.webView}
            originWhitelist={['*']}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            setSupportMultipleWindows={false}
            injectedJavaScript={INJECTED_JS}
            onNavigationStateChange={(state) => {
              setCurrentUrl(state.url)
            }}
            onLoadStart={() => {
              setIsLoading(true)
              setHasError(false)
              setErrorMessage(null)
              setLastResultSnippet(null)
              contentDetectedRef.current = false
            }}
            onMessage={(event) => {
              try {
                const payload = JSON.parse(event.nativeEvent.data)
                console.log('Received message from WebView:', payload)
                if (payload.type === 'SCORE_RESULT' && payload.score) {
                  setLastResultSnippet(`${payload.score}`)

                  setTimeout(() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack()
                    } else {
                      navigation.navigate('remaja_sehat' as never)
                    }
                  }, 3000)
                }
              } catch (_e) {
                console.log('Error parsing message from WebView:', _e)
                // Ignore non-JSON messages from page scripts.
              }
            }}
            onLoadEnd={(e) => {
              setIsLoading(false)
            }}
            onError={(event) => {
              setIsLoading(false)
              setHasError(true)
              setErrorMessage(event.nativeEvent.description)
            }}
            onHttpError={(event) => {
              setIsLoading(false)
              setHasError(true)
              setErrorMessage(`HTTP ${event.nativeEvent.statusCode}`)
            }}
          />

          {isLoading ? (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size={'large'} color={palette.secondary.base} />
              <Text style={styles.loaderText} enableTranslate={false}>
                Memuat {currentUrl}
              </Text>
            </View>
          ) : null}

          {lastResultSnippet ? (
            <View style={styles.resultBanner}>
              <Text style={styles.resultText} enableTranslate={false}>
                {lastResultSnippet}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  )
}

export default QuizWebViewScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  webView: {
    width: '100%',
    flex: 1,
    backgroundColor: '#fff',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  centered: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorCaption: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    fontWeight: '700',
    color: '#fff',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: '80%',
  },
  resultBanner: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  resultText: {
    color: '#fff',
    fontSize: 12,
  },
})
