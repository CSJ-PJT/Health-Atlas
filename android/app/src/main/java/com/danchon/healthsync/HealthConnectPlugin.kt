package com.danchon.healthsync

import android.util.Log
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.ZonedDateTime
import java.time.temporal.WeekFields
import java.util.Locale

private const val TAG = "HealthConnectPlugin"

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(BodyFatRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class)
    )

    // ---------------------------------------------------------------------
    //  공용 클라이언트
    // ---------------------------------------------------------------------
    private fun getOrCreateHealthConnectClient(): HealthConnectClient {
        return HealthConnectClient.getOrCreate(context)
    }

    // ---------------------------------------------------------------------
    //  ping
    // ---------------------------------------------------------------------
    @PluginMethod
    fun ping(call: PluginCall) {
        call.resolve(JSObject().put("ok", true))
    }

    // ---------------------------------------------------------------------
    //  권한 체크
    // ---------------------------------------------------------------------
    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        coroutineScope.launch {
            try {
                val client = getOrCreateHealthConnectClient()
                val granted = client.permissionController.getGrantedPermissions()
                val hasAll = granted.containsAll(permissions)

                val result = JSObject()
                result.put("hasAllPermissions", hasAll)
                result.put("granted", JSArray().apply {
                    granted.forEach { put(it) }
                })

                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "checkPermissions error", e)
                call.reject("Failed to check permissions", e)
            }
        }
    }

    // ---------------------------------------------------------------------
    //  권한 요청
    // ---------------------------------------------------------------------
    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        // NOTE: Capacitor 쪽에서 ActivityResultLauncher 사용 중
        // 여기서는 단순히 플래그만 내려줌
        coroutineScope.launch {
            try {
                val client = getOrCreateHealthConnectClient()
                val granted = client.permissionController.getGrantedPermissions()
                val hasAll = granted.containsAll(permissions)

                val result = JSObject()
                result.put("hasAllPermissions", hasAll)
                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "requestPermissions error", e)
                call.reject("Failed to request permissions", e)
            }
        }
    }

    // ---------------------------------------------------------------------
    //  요약 데이터 읽기
    //  period: "today" | "week" | "month" | "year"
    // ---------------------------------------------------------------------
    @PluginMethod
    fun readSummary(call: PluginCall) {
        val period = call.getString("period") ?: "today"

        coroutineScope.launch {
            try {
                val client = getOrCreateHealthConnectClient()

                val now = ZonedDateTime.now()
                val (start, end) = when (period) {
                    "week" -> {
                        val wf = WeekFields.of(Locale.getDefault())
                        val startOfWeek = now.with(wf.dayOfWeek(), 1).toLocalDate()
                            .atStartOfDay(now.zone)
                        startOfWeek to now
                    }

                    "month" -> {
                        val startOfMonth = now.withDayOfMonth(1).toLocalDate()
                            .atStartOfDay(now.zone)
                        startOfMonth to now
                    }

                    "year" -> {
                        val startOfYear = now.withDayOfYear(1).toLocalDate()
                            .atStartOfDay(now.zone)
                        startOfYear to now
                    }

                    else -> {
                        val startOfDay = now.toLocalDate().atStartOfDay(now.zone)
                        startOfDay to now
                    }
                }

                val result = JSObject()

                // ------------------- 걸음수 -------------------
                val stepsReq = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val stepsRes = client.readRecords(stepsReq)
                val stepsArr = JSArray()
                var totalSteps = 0L
                stepsRes.records.forEach { record ->
                    totalSteps += record.count
                    val obj = JSObject()
                    obj.put("count", record.count)
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())
                    stepsArr.put(obj)
                }
                result.put("steps", stepsArr)
                result.put("totalSteps", totalSteps)

                // ------------------- 거리 (DistanceRecord) -------------------
                val distReq = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val distRes = client.readRecords(distReq)
                var totalDistanceMeter = 0.0
                distRes.records.forEach { record ->
                    totalDistanceMeter += record.distance.inMeters
                }
                result.put("distanceMeter", totalDistanceMeter)

                // ------------------- 심박수 -------------------
                val hrReq = ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val hrRes = client.readRecords(hrReq)
                val hrArr = JSArray()
                hrRes.records.forEach { record ->
                    record.samples.forEach { sample ->
                        val obj = JSObject()
                        obj.put("bpm", sample.beatsPerMinute)
                        obj.put("time", sample.time.toString())
                        hrArr.put(obj)
                    }
                }
                result.put("heartRate", hrArr)

                // ------------------- 체중/체지방 -------------------
                val weightReq = ReadRecordsRequest(
                    recordType = WeightRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val weightRes = client.readRecords(weightReq)
                val weightArr = JSArray()
                weightRes.records.forEach { record ->
                    val obj = JSObject()
                    obj.put("kg", record.weight.inKilograms)
                    obj.put("time", record.time.toString())
                    weightArr.put(obj)
                }
                result.put("body", JSObject().apply {
                    put("weight", weightArr)
                })

                val bodyFatReq = ReadRecordsRequest(
                    recordType = BodyFatRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val bodyFatRes = client.readRecords(bodyFatReq)
                val bodyFatArr = JSArray()
                bodyFatRes.records.forEach { record ->
                    val obj = JSObject()
                    obj.put("percentage", record.percentage)
                    obj.put("time", record.time.toString())
                    bodyFatArr.put(obj)
                }
                result.getJSObject("body")!!.put("bodyFat", bodyFatArr)

                // ------------------- 운동 세션 -------------------
                val exReq = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val exRes = client.readRecords(exReq)
                val exArr = JSArray()
                var totalExerciseMinutes = 0.0
                var exerciseDistanceMeter = 0.0
                var exerciseCaloriesKcal = 0.0

                exRes.records.forEach { record ->
                    val obj = JSObject()
                    obj.put("title", record.title ?: "")
                    obj.put("exerciseType", record.exerciseType.name)
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())

                    val durationMin =
                        (record.endTime.toEpochSecond() - record.startTime.toEpochSecond()) / 60.0
                    totalExerciseMinutes += durationMin
                    obj.put("durationMinutes", durationMin)

                    // distance
                    val exDistReq = ReadRecordsRequest(
                        recordType = DistanceRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(record.startTime, record.endTime)
                    )
                    val exDistRes = client.readRecords(exDistReq)
                    var sessionDistance = 0.0
                    exDistRes.records.forEach { d ->
                        sessionDistance += d.distance.inMeters
                    }
                    exerciseDistanceMeter += sessionDistance
                    obj.put("distanceMeter", sessionDistance)

                    // calories
                    val exCalReq = ReadRecordsRequest(
                        recordType = TotalCaloriesBurnedRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(record.startTime, record.endTime)
                    )
                    val exCalRes = client.readRecords(exCalReq)
                    var sessionKcal = 0.0
                    exCalRes.records.forEach { c ->
                        sessionKcal += c.energy.inKilocalories
                    }
                    exerciseCaloriesKcal += sessionKcal
                    obj.put("caloriesKcal", sessionKcal)

                    exArr.put(obj)
                }
                result.put("exercises", exArr)

                // ------------------- 수면 -------------------
                val sleepReq = ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val sleepRes = client.readRecords(sleepReq)
                val sleepArr = JSArray()
                var totalSleepMinutes = 0.0
                sleepRes.records.forEach { record ->
                    val obj = JSObject()
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())
                    val durationMin =
                        (record.endTime.toEpochSecond() - record.startTime.toEpochSecond()) / 60.0
                    obj.put("durationMinutes", durationMin)
                    totalSleepMinutes += durationMin
                    sleepArr.put(obj)
                }
                result.put("sleepSessions", sleepArr)

                // ------------------- 영양 (섭취) -------------------
                val nReq = ReadRecordsRequest(
                    recordType = NutritionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val nRes = client.readRecords(nReq)
                val nArr = JSArray()
                var totalIntakeKcal = 0.0
                nRes.records.forEach { record ->
                    val obj = JSObject()
                    obj.put("time", record.startTime.toString())
                    obj.put("energyKcal", record.energy?.inKilocalories ?: 0.0)
                    obj.put("carbsGrams", record.carbohydrate?.inGrams ?: 0.0)
                    obj.put("proteinGrams", record.protein?.inGrams ?: 0.0)
                    obj.put("fatGrams", record.fat?.inGrams ?: 0.0)
                    totalIntakeKcal += (record.energy?.inKilocalories ?: 0.0)
                    nArr.put(obj)
                }
                result.put("nutrition", nArr)
                result.put("totalIntakeKcal", totalIntakeKcal)

                // ------------------- 총 소모 칼로리 -------------------
                val burnReq = ReadRecordsRequest(
                    recordType = TotalCaloriesBurnedRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
                val burnRes = client.readRecords(burnReq)
                var totalBurnKcal = 0.0
                burnRes.records.forEach { record ->
                    totalBurnKcal += record.energy.inKilocalories
                }
                // 운동 세션 별로 계산한 것과 합쳐서 살짝 여유 있게 사용
                val activeKcal = if (totalBurnKcal > 0.0) totalBurnKcal else exerciseCaloriesKcal

                result.put("activeCaloriesKcal", activeKcal)

                // ------------------- 집계 필드 -------------------
                result.put("exerciseMinutes", totalExerciseMinutes)
                result.put("sleepMinutes", totalSleepMinutes)
                result.put("exerciseDistanceMeter", exerciseDistanceMeter)

                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "readSummary error", e)
                call.reject("Failed to read summary", e)
            }
        }
    }
}
