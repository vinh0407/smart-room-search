package com.smartroomsearch.app.api

import android.content.Context
import android.content.SharedPreferences
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private const val BASE_URL = "https://smart-room-api.smart-room-backend.workers.dev/api/"
    private const val PREFS_NAME = "smartroom_prefs"
    private const val KEY_TOKEN = "auth_token"

    private var prefs: SharedPreferences? = null
    private var token: String? = null

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        token = prefs?.getString(KEY_TOKEN, null)
    }

    fun setToken(newToken: String?) {
        token = newToken
        prefs?.edit()?.putString(KEY_TOKEN, newToken)?.apply()
    }

    fun getToken(): String? = token

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val requestBuilder = original.newBuilder()
        token?.let {
            requestBuilder.header("Authorization", "Bearer $it")
        }
        val request = requestBuilder.build()
        chain.proceed(request)
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .addInterceptor(authInterceptor)
        .build()

    val instance: SmartRoomApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .client(httpClient)
            .build()
            .create(SmartRoomApiService::class.java)
    }
}