package com.danchon.healthsync

import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.PluginMethod
import kotlinx.coroutines.*
import java.time.ZonedDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val client: HealthConnectClient by lazy {
        HealthConnectClient.getOrCreate(context)
    }

    // Health Connect 퍼미션 ID들 (String)
    private val requiredPermissions: Set<String> by lazy {
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(BodyFatRecord::class),
            HealthPermission.getReadPermission(Vo2MaxRecord::class),
            HealthPermission.getReadPermission(HydrationRecord::class),
            HealthPermission.getReadPermission(NutritionRecord::class),
        )
    }

    @RequiresApi(Build.VERSION_CODES.O)
    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        pluginScope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val hasAll = granted.containsAll(requiredPermissions)

                val obj = JSObject().apply {
                    put("hasAll", hasAll)
                    put("requiredCount", requiredPermissions.size)
                    put("grantedCount", granted.size)
                }
                call.resolve(obj)
            } catch (e: Exception) {
                call.reject("Permission status failed: ${e.message}")
            }
        }
    }

    private suspend fun calcCalories(session: ExerciseSessionRecord): Double {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = ActiveCaloriesBurnedRecord::class,
                timeRangeFilter = TimeRangeFilter.between(session.startTime, session.endTime)
            )
        )
        var total = 0.0
        response.records.forEach { r ->
            total += r.energy.inKilocalories
        }
        return total
    }

    @RequiresApi(Build.VERSION_CODES.O)
    @PluginMethod
    fun getTodaySnapshot(call: PluginCall) {
        pluginScope.launch {
            try {
                Log.i("HealthConnect", "=== getTodaySnapshot() called ===")

                val now = ZonedDateTime.now()
                val start = now.toLocalDate().atStartOfDay(ZoneId.systemDefault())
                val range = TimeRangeFilter.between(start.toInstant(), now.toInstant())

                val result = JSObject()

                // Steps
                val stepsArr = JSArray()
                val stepsResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = StepsRecord::class,
                        timeRangeFilter = range
                    )
                )
                stepsResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("count", rec.count)
                    o.put("startTime", rec.startTime.toString())
                    o.put("endTime", rec.endTime.toString())
                    stepsArr.put(o)
                }
                result.put("steps", stepsArr)

                // Heart rate
                val hrArr = JSArray()
                val hrResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = HeartRateRecord::class,
                        timeRangeFilter = range
                    )
                )
                hrResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("bpm", rec.beatsPerMinute)
                    o.put("time", rec.time.toString())
                    hrArr.put(o)
                }
                result.put("heartRate", hrArr)

                // Exercise sessions + calories
                val exerciseArr = JSArray()
                val exResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = ExerciseSessionRecord::class,
                        timeRangeFilter = range
                    )
                )
                for (rec in exResp.records) {
                    val o = JSObject()
                    o.put("title", rec.title)
                    o.put("startTime", rec.startTime.toString())
                    o.put("endTime", rec.endTime.toString())
                    o.put("exerciseType", rec.exerciseType)
                    o.put("caloriesKcal", calcCalories(rec))
                    exerciseArr.put(o)
                }
                result.put("exerciseSessions", exerciseArr)

                // Sleep sessions
                val sleepArr = JSArray()
                val sleepResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = SleepSessionRecord::class,
                        timeRangeFilter = range
                    )
                )
                sleepResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("title", rec.title)
                    o.put("startTime", rec.startTime.toString())
                    o.put("endTime", rec.endTime.toString())
                    o.put("notes", rec.notes)
                    sleepArr.put(o)
                }
                result.put("sleepSessions", sleepArr)

                // Weight
                val weightArr = JSArray()
                val wResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = range
                    )
                )
                wResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("time", rec.time.toString())
                    o.put("weightKg", rec.weight.inKilograms)
                    weightArr.put(o)
                }
                result.put("weight", weightArr)

                // Nutrition
                val nutArr = JSArray()
                val nResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = NutritionRecord::class,
                        timeRangeFilter = range
                    )
                )
                nResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("energyKcal", rec.energy?.inKilocalories ?: 0.0)
                    o.put("proteinGrams", rec.protein?.inGrams ?: 0.0)
                    o.put("carbsGrams", rec.totalCarbohydrate?.inGrams ?: 0.0)
                    o.put("fatGrams", rec.totalFat?.inGrams ?: 0.0)
                    o.put("time", rec.startTime.toString())
                    nutArr.put(o)
                }
                result.put("nutrition", nutArr)

                // Hydration
                val hyArr = JSArray()
                val hResp = client.readRecords(
                    ReadRecordsRequest(
                        recordType = HydrationRecord::class,
                        timeRangeFilter = range
                    )
                )
                hResp.records.forEach { rec ->
                    val o = JSObject()
                    o.put("volumeMl", rec.volume.inMilliliters)
                    o.put("time", rec.startTime.toString())
                    hyArr.put(o)
                }
                result.put("hydration", hyArr)

                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Snapshot failed: ${e.message}")
            }
        }
    }
}
