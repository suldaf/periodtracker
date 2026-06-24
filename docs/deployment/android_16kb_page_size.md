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

Dependency penting yang sudah digunakan saat dokumentasi ini dibuat:

- `expo` `^53.0.0`
- `react-native` `0.79.6`
- `@react-native-firebase/*` `^24.0.0`
- `react-native-reanimated` `~3.17.4`
- `react-native-screens` `~4.11.1`
- `@shopify/react-native-skia` `2.0.0-next.4`

Solusi yang dipakai adalah menaikkan stack Android ke versi yang lebih baru, hardcode Android NDK 28+ untuk native library Skia, lalu membuat ulang native Android build secara lokal.

## Langkah Perbaikan

### 1. Pastikan dependency Android sudah di-upgrade

Masuk ke folder app:

```bash
cd app
```

Pastikan versi utama di `app/package.json` sudah menggunakan stack yang mendukung Android 15 dan 16 KB page size:

```json
"expo": "^53.0.0",
"react-native": "0.79.6"
```

Jika dependency native lain masih lama, upgrade dengan versi yang kompatibel dengan Expo SDK 53:

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

Untuk issue ini, build dilakukan secara lokal karena EAS server build belum bisa memakai NDK 28+ sesuai kebutuhan native library Skia.

Pertama, pastikan `app/src/resources/app.json` memakai `expo-build-properties` dan mengunci versi NDK ke 28+. Ini berguna untuk konfigurasi Expo/prebuild, tetapi belum cukup untuk native Android local build:

```json
[
  "expo-build-properties",
  {
    "android": {
      "compileSdkVersion": 35,
      "targetSdkVersion": 35,
      "buildToolsVersion": "35.0.0",
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

Build dilakukan langsung dari native Android/Gradle agar proses memakai Android SDK dan NDK dari machine lokal. Jangan memakai EAS server build untuk kasus ini karena environment-nya belum bisa memakai NDK 28+ sesuai kebutuhan Skia.

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

Cara termudah adalah upload ulang `.aab` ke Play Console dan pastikan warning 16 KB page size sudah hilang.

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
- Untuk kasus Skia dan NDK 28+, gunakan native Android local build sampai EAS server build menyediakan environment NDK 28+ yang sesuai.
- Simpan artifact build yang lolos Play Console sebagai referensi jika perlu rollback.
