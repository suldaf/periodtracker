# Mengatasi Android 16 KB Page Size Issue

Dokumen ini mencatat cara mengatasi warning atau penolakan Google Play terkait dukungan Android 16 KB memory page size pada aplikasi Oky.

Mulai Android 15, Android mendukung device dengan memory page size 16 KB. Jika aplikasi membawa native library (`.so`) dari React Native, Expo module, Firebase, Skia, Reanimated, atau dependency native lain, build Android harus dibuat dengan toolchain dan dependency yang sudah mendukung 16 KB ELF alignment.

Referensi resmi: [Android Developers - Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).

## Gejala

Masalah ini biasanya terlihat saat upload `.aab` atau `.apk` ke Google Play Console:

- Play Console memberi warning bahwa app tidak mendukung 16 KB page size.
- APK Analyzer menunjukkan satu atau lebih native library pada folder `lib/arm64-v8a` atau `lib/x86_64` belum 16 KB aligned.
- Build lama masih membawa native dependency dari versi React Native, Expo SDK, Android Gradle Plugin, NDK, atau third-party SDK yang belum kompatibel.

## Penyebab di Project Ini

Project ini adalah aplikasi Expo/React Native dan membawa beberapa dependency native. Karena itu, meskipun kode aplikasi sebagian besar TypeScript, artifact Android tetap berisi native library.

Dependency penting pada build yang sudah diverifikasi:

- `expo` `~54.0.37`
- `react-native` `0.81.5`
- `@react-native-firebase/*` `^24.0.0`
- `react-native-reanimated` `~4.1.1`
- `react-native-worklets` `0.5.1`
- `react-native-screens` `~4.16.0`
- `@shopify/react-native-skia` `2.2.12`

Solusi yang dipakai adalah Expo SDK 54/React Native 0.81, Android API 36, Android Gradle Plugin 8.11, Gradle 8.14.3, dan Android NDK 28. Build release kemudian diverifikasi dari AAB, bukan hanya dari nilai konfigurasi.

## Langkah Perbaikan

### 1. Pastikan dependency Android sudah di-upgrade

Masuk ke folder app:

```bash
cd app
```

Pastikan versi utama di `app/package.json` menggunakan stack API 36 dan 16 KB berikut:

```json
"expo": "~54.0.37",
"react-native": "0.81.5",
"react-native-reanimated": "~4.1.1",
"react-native-worklets": "0.5.1"
```

Periksa kompatibilitas dependency terhadap Expo SDK 54:

```bash
npx expo install --check
```

Jika ada package yang perlu disesuaikan, jalankan:

```bash
npx expo install <package-name>
```

Untuk package yang tidak dikelola Expo, cek release note package tersebut dan update ke versi yang sudah mendukung 16 KB page size.

### 2. Install ulang dependency

Dari root repo:

```bash
yarn
```

Atau dari folder app jika hanya dependency app yang sedang diperbaiki:

```bash
cd app
yarn
```

### 3. Regenerate native Android project

Karena project menggunakan Expo, generate ulang native Android agar Gradle config dan native dependency mengikuti versi Expo/RN terbaru:

```bash
cd app
npx expo prebuild --platform android --clean
```

Gunakan `--clean` agar folder Android lama tidak menyimpan konfigurasi native dari build sebelumnya.

### 4. Hardcode Android NDK 28+ di Expo config dan Gradle

Konfigurasi Expo dan native lokal sama-sama mengunci NDK 28 agar hasil prebuild EAS dan validasi lokal konsisten.

Pertama, pastikan `app/src/resources/app.json` memakai `expo-build-properties` dan mengunci versi NDK ke 28+. Ini berguna untuk konfigurasi Expo/prebuild, tetapi belum cukup untuk native Android local build:

```json
[
  "expo-build-properties",
  {
    "android": {
      "compileSdkVersion": 36,
      "targetSdkVersion": 36,
      "buildToolsVersion": "36.0.0",
      "ndkVersion": "28.0.12433566"
    }
  }
]
```

Untuk native Android local build, hardcode NDK version juga di `app/android/build.gradle`:

```gradle
buildscript {
  ext {
    ndkVersion "28.0.12433566"
  }
}
```

Lalu pastikan `app/android/app/build.gradle` membaca value tersebut di block `android`:

```gradle
android {
    ndkVersion rootProject.ext.ndkVersion
}
```

Jika local Android SDK sudah memakai NDK 28 versi lain, sesuaikan value `ndkVersion` dengan versi yang terinstall di machine lokal. Contoh versi NDK 28 lain yang pernah dipakai:

```json
"ndkVersion": "28.2.13676358"
```

Jika versi diganti, samakan value-nya di dua tempat:

- `app/src/resources/app.json`
- `app/android/build.gradle`

Pastikan NDK tersebut tersedia di Android Studio SDK Manager atau di folder Android SDK lokal:

```text
$ANDROID_HOME/ndk/<ndk-version>
```

### 5. Build ulang release artifact dari native Android

Build validasi dilakukan langsung dari native Android/Gradle agar versi SDK, NDK, manifest, dan alignment bisa diperiksa sebelum mengirim build EAS/Play Store.

```bash
cd app
cd android
./gradlew clean
```

Jika butuh APK untuk testing/internal distribution:

```bash
./gradlew assembleRelease
```

Jika butuh AAB untuk Play Store:

```bash
./gradlew bundleRelease
```

Jika Gradle gagal menemukan NDK 28+, pastikan `ndkVersion` di `app/android/build.gradle` sama dengan versi yang terinstall di Android SDK lokal, lalu jalankan ulang:

```bash
./gradlew clean
./gradlew bundleRelease
```

Artifact AAB biasanya ada di:

```text
app/android/app/build/outputs/bundle/release/app-release.aab
```

Artifact APK biasanya ada di:

```text
app/android/app/build/outputs/apk/release/app-release.apk
```

### 6. Verifikasi native library

Validasi lokal untuk build API 36 saat ini harus menghasilkan:

- `compileSdkVersion` dan `targetSdkVersion` 36.
- `versionCode` lebih tinggi daripada versi terakhir di Play Console.
- Bundle config `PAGE_ALIGNMENT_16K`.
- Tidak ada library `arm64-v8a` atau `x86_64` yang `UNALIGNED`.
- Tidak ada permission storage lama, `RECORD_AUDIO`, atau `SYSTEM_ALERT_WINDOW` pada manifest release.

Periksa bundle config dengan:

```bash
bundletool validate --bundle=app-release.aab
bundletool dump config --bundle=app-release.aab
```

Periksa manifest hasil bundle dengan:

```bash
bundletool dump manifest --bundle=app-release.aab --module=base
```

Setelah verifikasi lokal, upload `.aab` ke internal testing Play Console dan pastikan warning 16 KB page size sudah hilang.

Untuk verifikasi lokal, gunakan APK Analyzer di Android Studio:

1. Buka Android Studio.
2. Pilih `Build` -> `Analyze APK...`.
3. Pilih `.apk` atau `.aab` hasil build.
4. Buka folder `lib`.
5. Cek native library pada `arm64-v8a` dan `x86_64`.
6. Pastikan tidak ada alignment warning.

Jika ingin memakai script resmi Android, download `check_elf_alignment.sh` dari dokumentasi Android Developers, lalu jalankan ke artifact hasil build:

```bash
chmod +x check_elf_alignment.sh
./check_elf_alignment.sh app-release.apk
```

Output yang aman adalah semua library relevan berstatus `ALIGNED`.

## Jika Masih Gagal

Jika masih ada library `UNALIGNED`, cari nama file `.so` yang bermasalah dari output checker atau APK Analyzer. Biasanya nama file menunjukkan dependency asalnya, misalnya Firebase, Skia, Reanimated, atau library native lain.

Langkah berikutnya:

- Update package pemilik `.so` tersebut.
- Jalankan ulang `npx expo prebuild --platform android --clean`.
- Pastikan `ndkVersion` di `app/src/resources/app.json` dan `app/android/build.gradle` masih mengarah ke NDK 28+.
- Build ulang `.aab` atau `.apk` secara lokal.
- Verifikasi ulang.

Jika package belum punya versi yang mendukung 16 KB page size, opsinya adalah menunggu release package tersebut, mengganti dependency, atau menghapus fitur yang membawa library tersebut.

## Catatan Penting

- Jangan hanya menaikkan `targetSdkVersion`. Masalah ini ada di native library alignment, jadi artifact harus benar-benar dibuild ulang dengan dependency dan toolchain yang kompatibel.
- Jangan hanya mengubah `expo-build-properties`. Untuk native Android local build, `ndkVersion` harus ada juga di Gradle native Android.
- Jangan submit artifact lama setelah dependency diubah. Build ulang `.aab` dari awal.
- Simpan artifact build yang lolos Play Console sebagai referensi jika perlu rollback.

## Checklist Internal Testing Android 16

- Install build pada Android 16/API 36 dan minimal satu device Android lama yang masih didukung (API 24+).
- Cek launch/splash, login/daftar, kalender utama, pencatatan siklus, navigasi, deep link, notifikasi, Firebase Analytics/Crashlytics, dan pemutaran audio.
- Cek seluruh layar penting dalam portrait dan landscape untuk overlap status/navigation bar setelah edge-to-edge aktif.
- Cek tombol dan gesture back pada root screen, nested screen, modal, serta WebView.
- Cek update dari versi production sebelumnya tanpa menghapus data aplikasi.
- Pastikan `versionCode` build yang di-upload lebih besar daripada versi tertinggi di Play Console.
- Pastikan Pre-launch report dan warning policy Play Console bersih sebelum mempromosikan build ke production.
