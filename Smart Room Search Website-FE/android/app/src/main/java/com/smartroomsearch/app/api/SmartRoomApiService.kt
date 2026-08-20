package com.smartroomsearch.app.api

import com.smartroomsearch.app.model.*
import retrofit2.Response
import retrofit2.http.*

interface SmartRoomApiService {
    
    // --- 1. AUTHENTICATION ---
    @POST("login")
    suspend fun login(@Body body: Map<String, String>): Response<LoginResponse>

    @POST("register")
    suspend fun register(@Body body: Map<String, String>): Response<Map<String, Any>>

    @GET("me")
    suspend fun getMe(@Header("Authorization") token: String): Response<Map<String, Any>>

    // --- 2. ROOMS ---
    @GET("rooms/version")
    suspend fun getRoomsVersion(): Response<Map<String, Long>>

    @GET("rooms/stats")
    suspend fun getRoomStats(@Header("Authorization") token: String): Response<Map<String, Any>>

    @GET("rooms")
    suspend fun listRooms(
        @Query("status") status: String? = null,
        @Query("district") district: String? = null,
        @Query("priceMin") priceMin: Double? = null,
        @Query("priceMax") priceMax: Double? = null,
        @Query("areaMin") areaMin: Double? = null,
        @Query("areaMax") areaMax: Double? = null,
        @Query("search") search: String? = null
    ): Response<List<Room>>

    @GET("rooms/{id}")
    suspend fun getRoom(@Path("id") id: Int): Response<Room>

    @POST("rooms")
    suspend fun createRoom(@Header("Authorization") token: String, @Body room: Room): Response<Map<String, Any>>

    @POST("rooms")
    suspend fun createRoomMap(@Header("Authorization") token: String, @Body room: Map<String, Any?>): Response<Map<String, Any>>

    @PUT("rooms/{id}")
    suspend fun updateRoom(@Header("Authorization") token: String, @Path("id") id: Int, @Body room: Map<String, Any?>): Response<Map<String, Any>>

    @DELETE("rooms/{id}")
    suspend fun deleteRoom(@Header("Authorization") token: String, @Path("id") id: Int): Response<Map<String, Any>>

    @PUT("rooms/{id}/status")
    suspend fun updateRoomStatus(
        @Header("Authorization") token: String, 
        @Path("id") id: Int, 
        @Body statusBody: Map<String, String>
    ): Response<Map<String, Any>>

    @POST("rooms/{id}/view")
    suspend fun incrementView(@Path("id") id: Int): Response<Map<String, Any>>

    @POST("rooms/{id}/contact")
    suspend fun incrementContact(@Path("id") id: Int): Response<Map<String, Any>>

    // --- 3. TENANTS ---
    @GET("tenants")
    suspend fun listTenants(@Header("Authorization") token: String, @Query("roomId") roomId: Int? = null): Response<List<Tenant>>

    @POST("tenants")
    suspend fun createTenant(@Header("Authorization") token: String, @Body tenant: Tenant): Response<Map<String, Any>>

    @PUT("tenants/{id}")
    suspend fun updateTenant(@Header("Authorization") token: String, @Path("id") id: Int, @Body tenant: Map<String, Any?>): Response<Map<String, Any>>

    @DELETE("tenants/{id}")
    suspend fun deleteTenant(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Query("reason") reason: String? = null
    ): Response<Map<String, Any>>

    @GET("tenant-history")
    suspend fun listTenantHistory(@Header("Authorization") token: String): Response<List<TenantHistory>>

    // --- 4. DEMANDS (NHU CẦU TÌM PHÒNG) ---
    @GET("demands")
    suspend fun listDemands(): Response<List<RoomDemand>>

    @POST("demands")
    suspend fun createDemand(@Body demand: RoomDemand): Response<Map<String, Any>>

    @DELETE("demands/{id}")
    suspend fun deleteDemand(@Header("Authorization") token: String, @Path("id") id: Int): Response<Map<String, Any>>

    // --- 5. AI & GEOCODING ---
    @POST("ai/room-description")
    suspend fun generateRoomDescription(
        @Header("Authorization") token: String, 
        @Body body: Map<String, Any>
    ): Response<Map<String, String>>

    @GET("geocode")
    suspend fun geocodeAddress(
        @Header("Authorization") token: String, 
        @Query("address") address: String,
        @Query("district") district: String? = null,
        @Query("city") city: String? = "TP.HCM"
    ): Response<Map<String, Any>>
}
