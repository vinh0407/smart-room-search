// Top-level build file where you can add configuration options common to all sub-projects/modules.

extra.set("minSdkVersion", 24)
extra.set("compileSdkVersion", 35)
extra.set("targetSdkVersion", 35)
extra.set("kotlinVersion", "2.0.21")
extra.set("composeBomVersion", "2024.12.01")
extra.set("androidxActivityVersion", "1.9.3")
extra.set("androidxAppCompatVersion", "1.7.0")
extra.set("androidxCoordinatorLayoutVersion", "1.3.0")
extra.set("androidxCoreVersion", "1.15.0")
extra.set("androidxFragmentVersion", "1.8.5")
extra.set("coreSplashScreenVersion", "1.0.1")
extra.set("androidxWebkitVersion", "1.12.1")
extra.set("lifecycleVersion", "2.8.7")
extra.set("retrofitVersion", "2.11.0")
extra.set("coilVersion", "2.7.0")
extra.set("navVersion", "2.8.5")
extra.set("junitVersion", "4.13.2")
extra.set("androidxJunitVersion", "1.2.1")
extra.set("androidxEspressoCoreVersion", "3.6.1")
extra.set("cordovaAndroidVersion", "14.0.1")

plugins {
    id("com.android.application") version "8.7.3" apply false
    id("com.android.library") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("com.google.devtools.ksp") version "2.0.21-1.0.25" apply false
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.google.gms:google-services:4.5.0")
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
