plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.smartroomsearch.app"
    compileSdk = rootProject.extra["compileSdkVersion"] as Int

    defaultConfig {
        applicationId = "com.smartroomsearch.app"
        minSdk = rootProject.extra["minSdkVersion"] as Int
        targetSdk = rootProject.extra["targetSdkVersion"] as Int
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlin {
        jvmToolchain(21)
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar", "*.aar"))))

    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("io.coil-kt:coil-compose:2.7.0")

    implementation(platform("org.jetbrains.kotlin:kotlin-bom:2.0.21"))
    constraints {
        implementation("org.jetbrains.kotlin:kotlin-stdlib:2.0.21")
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.0.21")
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.0.21")
    }

    // Versions
    val androidxAppCompatVersion = rootProject.extra["androidxAppCompatVersion"] as String
    val androidxActivityVersion = rootProject.extra["androidxActivityVersion"] as String
    val androidxFragmentVersion = rootProject.extra["androidxFragmentVersion"] as String
    val androidxCoreVersion = rootProject.extra["androidxCoreVersion"] as String
    val coreSplashScreenVersion = rootProject.extra["coreSplashScreenVersion"] as String
    val junitVersion = rootProject.extra["junitVersion"] as String
    val androidxJunitVersion = rootProject.extra["androidxJunitVersion"] as String
    val androidxEspressoCoreVersion = rootProject.extra["androidxEspressoCoreVersion"] as String
    val lifecycleVersion = rootProject.extra["lifecycleVersion"] as String
    val retrofitVersion = rootProject.extra["retrofitVersion"] as String
    val coilVersion = rootProject.extra["coilVersion"] as String
    val navVersion = rootProject.extra["navVersion"] as String

    // Core
    implementation("androidx.appcompat:appcompat:$androidxAppCompatVersion")
    implementation("androidx.activity:activity-ktx:$androidxActivityVersion")
    implementation("androidx.fragment:fragment-ktx:$androidxFragmentVersion")
    implementation("androidx.core:core-ktx:$androidxCoreVersion")
    implementation("androidx.core:core-splashscreen:$coreSplashScreenVersion")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("com.google.android.material:material:1.12.0")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:$lifecycleVersion")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:$lifecycleVersion")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:$lifecycleVersion")

    // Navigation
    implementation("androidx.navigation:navigation-fragment-ktx:$navVersion")
    implementation("androidx.navigation:navigation-ui-ktx:$navVersion")

    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:$retrofitVersion")
    implementation("com.squareup.retrofit2:converter-gson:$retrofitVersion")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Room
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")
    // For Kotlin Symbol Processing (KSP) which is preferred for Room + Kotlin 2.0
    // But since we are using Kotlin 2.0.21, we should use KSP. 
    // I will check if KSP is enabled.

    // Image Loading
    implementation("io.coil-kt:coil:$coilVersion")

    testImplementation("junit:junit:$junitVersion")
    androidTestImplementation("androidx.test.ext:junit:$androidxJunitVersion")
    androidTestImplementation("androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion")
}

tasks.configureEach {
    if (name.startsWith("check") && name.endsWith("Classpath")) {
        enabled = false
    }
}
