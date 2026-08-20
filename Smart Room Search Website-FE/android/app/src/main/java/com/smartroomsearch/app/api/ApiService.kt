package com.smartroomsearch.app.api

import com.smartroomsearch.app.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    // Public routes
    @GET("rooms")
    suspend fun getRooms(
        @Query("status") status: String? = null,
        @Query("district") district: String? = null,
        @Query("priceMin") priceMin: Long? = null,
        @Query("priceMax") priceMax: Long? = null,
        @Query("areaMin") areaMin: Double? = null,
        @Query("areaMax") areaMax: Double? = null,
        @Query("search") search: String? = null
    ): List<Room>

    @GET("rooms/{id}")
    suspend fun getRoomDetail(@Path("id") id: Int): Room

    @POST("rooms/{id}/view")
    suspend fun trackView(@Path("id") id: Int): Response<Unit>

    @POST("rooms/{id}/contact")
    suspend fun trackContact(@Path("id") id: Int): Response<Unit>

    @GET("demands")
    suspend fun getDemands(): List<RoomDemand>

    @POST("demands")
    suspend fun createDemand(@Body demand: RoomDemand): Response<Unit>

    // Auth
    @POST("login")
    suspend fun login(@Body body: Map<String, String>): LoginResponse

    @POST("register")
    suspend fun register(@Body body: Map<String, String>): Response<Unit>

    @GET("me")
    suspend fun getMe(@Header("Authorization") token: String): UserInfo

    // Admin routes
    @GET("rooms/stats")
    suspend fun getStats(@Header("Authorization") token: String): Map<String, Any>

    @POST("rooms")
    suspend fun createRoom(@Header("Authorization") token: String, @Body room: Room): Response<Unit>

    @PUT("rooms/{id}")
    suspend fun updateRoom(@Header("Authorization") token: String, @Path("id") id: Int, @Body room: Room): Response<Unit>

    @DELETE("rooms/{id}")
    suspend fun deleteRoom(@Header("Authorization") token: String, @Path("id") id: Int): Response<Unit>

    @GET("tenants")
    suspend fun getTenants(@Header("Authorization") token: String): List<Tenant>
}
