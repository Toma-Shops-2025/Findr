# Release minify / R8 — keep React Native & Expo entrypoints
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class expo.modules.** { *; }
-keepattributes *Annotation*
-keepclassmembers class * {
  @com.facebook.react.uimanager.annotations.ReactProp <methods>;
  @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}
