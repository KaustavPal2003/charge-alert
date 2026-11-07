#!/usr/bin/env bash
set -e

echo "=== Building Charge Alert v1.4.0 APK ==="
APP_DIR="/app/applet/android-project/app"
BUILD_DIR="/tmp/chargealert_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/apk" "/tmp/keystore"

# 1. Generate R.java with aapt
echo "1. Generating R.java..."
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$APP_DIR/src/main/AndroidManifest.xml" \
    -S "$APP_DIR/src/main/res" \
    -I /tmp/android-34.jar

# 2. Compile Java sources
echo "2. Compiling Java sources..."
javac -source 8 -target 8 -encoding UTF-8 \
    -cp "/tmp/android-34.jar:$BUILD_DIR/gen" \
    -d "$BUILD_DIR/obj" \
    $(find "$APP_DIR/src/main/java" "$BUILD_DIR/gen" -name "*.java")

# 3. Dex classes
echo "3. Dexing classes..."
/usr/local/bin/dx --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/obj"

# 4. Package resources into unaligned APK
echo "4. Packaging resources into APK..."
aapt package -f \
    -M "$APP_DIR/src/main/AndroidManifest.xml" \
    -S "$APP_DIR/src/main/res" \
    -I /tmp/android-34.jar \
    -F "$BUILD_DIR/unaligned.apk"

# 5. Add classes.dex to APK
echo "5. Adding classes.dex..."
cd "$BUILD_DIR"
aapt add unaligned.apk classes.dex

# 6. Align APK
echo "6. Aligning APK..."
zipalign -f -p 4 unaligned.apk aligned.apk

# 7. Generate release keystore if missing
KEYSTORE="/tmp/keystore/chargealert.keystore"
if [ ! -f "$KEYSTORE" ]; then
    echo "7a. Generating keystore..."
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias chargealert \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass android123 \
        -keypass android123 \
        -dname "CN=Charge Alert, OU=Mobile, O=ChargeAlert, L=Global, S=Global, C=US"
fi

# 8. Sign APK with v1 and v2 signature scheme
echo "8. Signing APK..."
apksigner sign \
    --ks "$KEYSTORE" \
    --ks-key-alias chargealert \
    --ks-pass pass:android123 \
    --key-pass pass:android123 \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --out "/app/applet/public/ChargeAlert.apk" \
    aligned.apk

# 9. Verify APK
echo "9. Verifying signed APK..."
apksigner verify --verbose "/app/applet/public/ChargeAlert.apk"

# 10. Update sha256 checksum and size
SHA256=$(sha256sum /app/applet/public/ChargeAlert.apk | awk '{print $1}')
SIZE=$(stat -c%s /app/applet/public/ChargeAlert.apk)
echo "APK Built Successfully!"
echo "Size: $SIZE bytes"
echo "SHA-256: $SHA256"

# 11. Re-package source zip
echo "11. Creating ChargeAlert-source.zip..."
cd /app/applet
zip -r -q /app/applet/public/ChargeAlert-source.zip android-project/ -x "*.class" -x "*.dex"

echo "=== ALL BUILD TASKS COMPLETED SUCCESSFULLY ==="
