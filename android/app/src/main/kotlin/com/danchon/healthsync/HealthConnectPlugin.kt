package com.danchon.healthsync

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.PluginMethod
import kotlinx.coroutines.*
import java.time.Instant
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // 한 번에 요청할 퍼미션 세트 (필요한 타입만 추가/삭제에서 사용)
    @RequiresApi(Build.VERSION_CODES.O)
    private val permissions by lazy {
        setOf(
            HealthPermission.createReadPermission(StepsRecord::class),
            HealthPermission.createReadPermission(DistanceRecord::class),
            HealthPermission.createReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.createReadPermission(HeartRateRecord::class),
            HealthPermission.createReadPermission(SleepSessionRecord::class),
            HealthPermission.createReadPermission(ExerciseSessionRecord::class),
            HealthPermission.createReadPermission(WeightRecord::class),
            HealthPermission.createReadPermission(BodyFatRecord::class)
            // 필요하면 여기 계속 추가
            // (BloodPressureRecord, Vo2MaxRecord 등)
        )
    }

    // JS에서 호출할 메서드:
    // HealthConnect.readTodaySnapshot()
    @RequiresApi(Build.VERSION_CODES.O)
    @PluginMethod
    fun readTodaySnapshot(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Health Connect requires Android 8.0+")
            return
        }

        val context = this.context
        if (context == null) {
            call.reject("No Android context")
            return
        }

        pluginScope.launch {
            try {
                // 1) 퍼미션 확보
                val granted = ensurePermissionsForSnapshot(HealthConnectClient.getOrCreate(context))
                if (!granted) {
                    withContext(Dispatchers.Main) {
                        call.reject("Health Connect permissions not granted")
                    }
                    return@launch
                }

                // 2) 오늘 0시 ~ 내일 0시 범위 계산
                val end = ZonedDateTime.now()
                val start = end.truncatedTo(ChronoUnit.DAYS)

                // 3) 타입별 데이터 읽기 함수들
                val client = HealthConnectClient.getOrCreate(context)

                val steps = readSteps(client, start, end)
                val distance = readDistance(client, start, end)
                val calories = readActiveCalories(client, start, end)
                val heartRate = readHeartRate(client, start, end)
                val sleep = readSleepSessions(client, start, end)
                val exercises = readExerciseSessions(client, start, end)
                val bodyWeight = readBodyWeight(client, start, end)
                val bodyFat = readBodyFat(client, start, end)

                // 4) JS로 넘길 JSON 구성
                val result = JSObject()
                result.put("startTime", start.toString())
                result.put("endTime", end.toString())
                result.put("steps", steps)
                result.put("distance", distance)
                result.put("calories", calories)
                result.put("heartRate", heartRate)
                result.put("sleep", sleep)
                result.put("exercises", exercises)
                result.put("bodyweight", bodyWeight)
                result.put("bodyfat", bodyFat)

                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Health Connect error: ${e.message}", e)
                }
            }
        }
    }

    // ------------------- 권한 관련 -------------------
    @RequiresApi(Build.VERSION_CODES.O)
    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Health Connect requires Android 8.0+")
            return
        }

        val context = this.context
        if (context == null) {
            call.reject("No Android context")
            return
        }

        pluginScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = ensurePermissionsInternal(client)
                
                val result = JSObject()
                result.put("granted", granted)
                
                withContext(Dispatchers.Main) {
                    call.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Failed to ensure permissions: ${e.message}", e)
                }
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun ensurePermissionsInternal(client: HealthConnectClient): Boolean {
        val controller = client.permissionController
        val granted = controller.getGrantedPermissions(permissions)

        if (granted.containsAll(permissions)) return true

        // permission UI 표시 (현재 Activity 필요)
        val activity = activity ?: return false

        val result = controller.requestPermissions(activity, permissions)
        return result.containsAll(permissions)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun ensurePermissionsForSnapshot(client: HealthConnectClient): Boolean {
        return ensurePermissionsInternal(client)
    }

    // ------------------- 타입별 읽기 함수들 -------------------

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readSteps(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Long {
        val req = ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val out = JSArray()
        val response = client.readRecords(req)
        response.records.forEach { record ->
            val obj = JSObject()
            obj.put("count", record.count)
            out.put(obj)
        }
        return response.records.sumOf { it.count }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readDistance(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = DistanceRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        // meters -> km
        return response.records.sumOf { it.distance.inKilometers }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readActiveCalories(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = ActiveCaloriesBurnedRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        return response.records.sumOf { it.energy.inKilocalories }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readHeartRate(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = HeartRateRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        if (response.records.isEmpty()) return 0.0

        val allBpm = response.records.flatMap { rec ->
            rec.samples.map { it.beatsPerMinute.toDouble() }
        }
        return if (allBpm.isEmpty()) 0.0 else allBpm.average()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readSleepSessions(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = SleepSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        val totalMinutes = response.records.sumOf { rec ->
            java.time.Duration.between(rec.startTime, rec.endTime).toMinutes()
        }
        return totalMinutes / 60.0 // 시간 단위
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readExerciseSessions(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Long {
        val req = ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        return response.records.sumOf { rec ->
            java.time.Duration.between(rec.startTime, rec.endTime).toMinutes()
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readBodyWeight(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = WeightRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        return response.records.lastOrNull()?.weight?.inKilograms ?: 0.0
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private suspend fun readBodyFat(
        client: HealthConnectClient,
        start: ZonedDateTime,
        end: ZonedDateTime
    ): Double {
        val req = ReadRecordsRequest(
            recordType = BodyFatRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start.toInstant(), end.toInstant())
        )
        val response = client.readRecords(req)
        return response.records.lastOrNull()?.percentage?.value ?: 0.0
    }
}
