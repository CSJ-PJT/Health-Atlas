package com.danchon.healthsync

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.DayOfWeek
import java.time.LocalTime

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val TAG = "HealthConnectPlugin"

    private var client: HealthConnectClient? = null
    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    override fun load() {
        super.load()
        val ctx: Context = context ?: return

        try {
            client = HealthConnectClient.getOrCreate(ctx)
            Log.d(TAG, "HealthConnectClient created")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create HealthConnectClient", e)
            client = null
        }
    }

    private fun ensureClient(call: PluginCall): HealthConnectClient? {
        val c = client
        return if (c == null) {
            call.reject("Health Connect client not available on this device")
            null
        } else {
            c
        }
    }

    // ------------------------------------------------------------------------
    // ping
    // ------------------------------------------------------------------------
    @PluginMethod
    fun ping(call: PluginCall) {
        val res = JSObject()
        res.put("value", "pong from Android")
        call.resolve(res)
    }

    // ------------------------------------------------------------------------
    // checkPermissions
    //  - 아주 짧은 구간으로 StepsRecord 읽기 시도
    //  - SecurityException 나면 권한 없음으로 판단
    // ------------------------------------------------------------------------
    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Health Connect requires Android 8 (Oreo) or higher")
            return
        }

        val c = ensureClient(call) ?: return

        scope.launch {
            try {
                val now = Instant.now()
                val timeRange = TimeRangeFilter.between(now.minusMillis(1), now)
                val req = ReadRecordsRequest(StepsRecord::class, timeRange)

                try {
                    c.readRecords(req)
                    // 예외 없이 통과 → 권한 있음
                    val res = JSObject()
                    res.put("hasAllPermissions", true)
                    res.put("granted", JSArray().apply { put("HealthConnect:read") })
                    res.put("missing", JSArray())
                    call.resolve(res)
                } catch (sec: SecurityException) {
                    Log.w(TAG, "checkPermissions: SecurityException, no permission", sec)
                    val res = JSObject()
                    res.put("hasAllPermissions", false)
                    res.put("granted", JSArray())
                    res.put("missing", JSArray().apply { put("HealthConnect:read") })
                    call.resolve(res)
                }
            } catch (e: Exception) {
                Log.e(TAG, "checkPermissions error", e)
                call.reject("Failed to check permissions", e)
            }
        }
    }

    // ------------------------------------------------------------------------
    // requestPermissions
    //  - Health Connect 앱을 직접 실행해서 사용자에게 권한 켜도록 유도
    // ------------------------------------------------------------------------
    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val ctx = context
        if (ctx == null) {
            call.reject("No context")
            return
        }

        var opened = false

        try {
            val pm = ctx.packageManager
            val intent = pm.getLaunchIntentForPackage("com.google.android.apps.healthdata")

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
                opened = true
            } else {
                Log.w(TAG, "Health Connect launch intent not found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestPermissions: failed to open Health Connect app", e)
        }

        val res = JSObject()
        res.put("hasAllPermissions", false)
        res.put("granted", JSArray())
        res.put("missing", JSArray().apply { put("HealthConnect:read") })
        res.put("opened", opened)
        call.resolve(res)
    }

    // ------------------------------------------------------------------------
    // openHealthConnectSettings : Health Connect 설정 화면 열기
    // ------------------------------------------------------------------------
    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        val ctx = activity ?: context
        val pm = ctx.packageManager

        try {
            val intents = mutableListOf(
                Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS),
                Intent("android.settings.HEALTH_CONNECT_SETTINGS"),
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", "com.google.android.apps.healthdata", null)
                },
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", "com.android.healthconnect", null)
                }
            )

            for (intent in intents) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(pm) != null) {
                    activity?.startActivity(intent) ?: ctx.startActivity(intent)
                    val ret = JSObject()
                    ret.put("opened", true)
                    call.resolve(ret)
                    return
                }
            }

            Log.w(TAG, "Health Connect settings Activity not found on this device")
            val ret = JSObject()
            ret.put("opened", false)
            call.resolve(ret)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Health Connect settings", e)
            call.reject("Failed to open Health Connect settings: ${e.message}")
        }
    }

    // ------------------------------------------------------------------------
    // readSummary : 오늘 기준 건강 데이터 요약
    // ------------------------------------------------------------------------
    @PluginMethod
    fun readSummary(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("Health Connect requires Android 8 (Oreo) or higher")
            return
        }

        val c = ensureClient(call) ?: return

        scope.launch {
            try {
                val now = Instant.now()
                val zone = ZoneId.systemDefault()
                val startOfDay = now.atZone(zone)
                    .toLocalDate()
                    .atStartOfDay(zone)
                    .toInstant()

                val timeRange = TimeRangeFilter.between(startOfDay, now)

                // ───── Steps ─────
                val stepsReq = ReadRecordsRequest(StepsRecord::class, timeRange)
                val stepsResult = c.readRecords(stepsReq)
                val stepsArray = JSArray()
                var totalSteps = 0L
                for (record in stepsResult.records) {
                    val obj = JSObject()
                    obj.put("count", record.count)
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())
                    obj.put("source", record.metadata.dataOrigin.packageName)
                    stepsArray.put(obj)
                    totalSteps += record.count
                }

                // ───── Heart rate ─────
                val hrReq = ReadRecordsRequest(HeartRateRecord::class, timeRange)
                val hrResult = c.readRecords(hrReq)
                val hrArray = JSArray()
                for (record in hrResult.records) {
                    for (sample in record.samples) {
                        val obj = JSObject()
                        obj.put("bpm", sample.beatsPerMinute)
                        obj.put("time", sample.time.toString())
                        hrArray.put(obj)
                    }
                }

                // ───── Exercise sessions ─────
                val exReq = ReadRecordsRequest(ExerciseSessionRecord::class, timeRange)
                val exResult = c.readRecords(exReq)
                val exArray = JSArray()
                var totalExerciseMinutes = 0.0
                for (record in exResult.records) {
                    val obj = JSObject()
                    obj.put("title", record.title ?: "운동")
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())

                    // exerciseType: 버전별 상수 차이가 있으므로 최소한만 매핑
                    val typeStr = when (record.exerciseType) {
                        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "RUNNING"
                        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "WALKING"
                        else -> "OTHER"
                    }
                    obj.put("exerciseType", typeStr)

                    // 거리/칼로리는 여기선 0으로 내려줌 (필요하면 나중에 세분화)
                    obj.put("distanceMeter", 0)
                    obj.put("caloriesKcal", 0)

                    exArray.put(obj)

                    val durationMinutes =
                        (record.endTime.toEpochMilli() - record.startTime.toEpochMilli()) / 60000.0
                    if (durationMinutes > 0) totalExerciseMinutes += durationMinutes
                }

                // ───── Sleep sessions ─────
                val sleepReq = ReadRecordsRequest(SleepSessionRecord::class, timeRange)
                val sleepResult = c.readRecords(sleepReq)
                val sleepArray = JSArray()
                var totalSleepMinutes = 0.0
                for (record in sleepResult.records) {
                    val obj = JSObject()
                    obj.put("startTime", record.startTime.toString())
                    obj.put("endTime", record.endTime.toString())
                    val minutes =
                        (record.endTime.toEpochMilli() - record.startTime.toEpochMilli()) / 60000.0
                    if (minutes > 0) totalSleepMinutes += minutes
                    sleepArray.put(obj)
                }

                // ───── Body (weight / bodyFat) ─────
                val weightReq = ReadRecordsRequest(WeightRecord::class, timeRange)
                val weightResult = c.readRecords(weightReq)
                val weightArray = JSArray()
                for (record in weightResult.records) {
                    val obj = JSObject()
                    obj.put("kg", record.weight.inKilograms)
                    obj.put("time", record.time.toString())
                    weightArray.put(obj)
                }

                val bodyFatReq = ReadRecordsRequest(BodyFatRecord::class, timeRange)
                val bodyFatResult = c.readRecords(bodyFatReq)
                val bodyFatArray = JSArray()
                for (record in bodyFatResult.records) {
                    val obj = JSObject()
                    obj.put("percent", record.percentage)
                    obj.put("time", record.time.toString())
                    bodyFatArray.put(obj)
                }

                val bodyObj = JSObject()
                bodyObj.put("weight", weightArray)
                bodyObj.put("bodyFat", bodyFatArray)

                // ───── Nutrition (지금은 비워두기) ─────
                val nutritionArray = JSArray()

                // ───── 단순 추정치 aggregate (걸음수 기반) ─────
                val estimatedDistanceMeters = (totalSteps * 0.8).toLong() // 대략 0.8m/step
                val estimatedActiveCalories = (totalSteps * 0.04).toInt() // 대략 0.04kcal/step

                val res = JSObject()
                res.put("timeRangeStart", startOfDay.toString())
                res.put("timeRangeEnd", now.toString())

                res.put("steps", stepsArray)
                res.put("heartRate", hrArray)
                res.put("exercises", exArray)
                res.put("sleepSessions", sleepArray)
                res.put("body", bodyObj)
                res.put("nutrition", nutritionArray)

                // TS 쪽에서 anySummary.* 로 읽을 수 있게 aggregate 필드도 내려줌
                res.put("aggregateSteps", totalSteps)
                res.put("aggregateDistanceMeters", estimatedDistanceMeters)
                res.put("aggregateActiveCaloriesKcal", estimatedActiveCalories)
                res.put("aggregateExerciseMinutes", Math.round(totalExerciseMinutes))
                res.put("aggregateSleepMinutes", Math.round(totalSleepMinutes))

                // 아직은 0 으로 둠 (나중에 HydrationRecord, Vo2MaxRecord 붙이면 됨)
                res.put("hydrationLiters", 0.0)
                res.put("vo2max", 0.0)

                call.resolve(res)
            } catch (e: SecurityException) {
                Log.e(TAG, "readSummary: permission error", e)
                call.reject(
                    "Missing Health Connect permissions. Please grant access in Health Connect app.",
                    e
                )
            } catch (e: Exception) {
                Log.e(TAG, "readSummary error", e)
                call.reject("Failed to read health summary", e)
            }
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        job.cancel()
    }

    private fun getPeriodRange(type: String): Pair<ZonedDateTime, ZonedDateTime> {
        val now = ZonedDateTime.now()
        val zone = now.zone

        return when (type) {
            "today" -> {
                val start = now.toLocalDate().atStartOfDay(zone)
                val end = start.plusDays(1)
                start to end
            }

            "week" -> {
                // 이번주 월요일 0시 ~ 다음주 월요일 0시
                val startOfWeek = now.with(DayOfWeek.MONDAY)
                    .toLocalDate()
                    .atStartOfDay(zone)
                val endOfWeek = startOfWeek.plusWeeks(1)
                startOfWeek to endOfWeek
            }

            "month" -> {
                // 이번달 1일 0시 ~ 다음달 1일 0시
                val startOfMonth = now.withDayOfMonth(1)
                    .toLocalDate()
                    .atStartOfDay(zone)
                val endOfMonth = startOfMonth.plusMonths(1)
                startOfMonth to endOfMonth
            }

            "year" -> {
                // 올해 1/1 0시 ~ 내년 1/1 0시
                val startOfYear = now.withDayOfYear(1)
                    .toLocalDate()
                    .atStartOfDay(zone)
                val endOfYear = startOfYear.plusYears(1)
                startOfYear to endOfYear
            }

            else -> {
                // 잘못된 값 들어오면 일단 today로 처리
                val start = now.toLocalDate().atStartOfDay(zone)
                val end = start.plusDays(1)
                start to end
            }
        }
    }

    @PluginMethod
    fun readPeriodSummary(call: PluginCall) {
        // JS/TS 쪽에서 넘겨줄 값: "today" | "week" | "month" | "year"
        val type = call.getString("type") ?: "today"

        val (startZdt, endZdt) = getPeriodRange(type)
        val startInstant = startZdt.toInstant()
        val endInstant = endZdt.toInstant()

        // ⚠️ 아래 부분은 "기존 readSummary() 코드를 그대로 복사"하되
        // 날짜 범위만 오늘(Today)이 아니라 위에서 계산한 startInstant/endInstant 를 쓰도록 바꾸면 됨.

        coroutineScope.launch {
            try {
                // 예시: 네 기존 코드 스타일에 맞게 맞춰줘.
                val client = getOrCreateHealthConnectClient()

                // ↓↓↓ 여기 부분은 기존 readSummary 내부에서
                // steps / exercises / sleep / nutrition 읽던 로직 그대로 사용.
                // 단, 기존에는 "오늘 0시~24시" 썼다면
                // 여기서는 startInstant ~ endInstant 를 사용.

                val resultJson = JSObject()

                // 예: 걸음수 예시 (네 플러그인 코드에 맞게 조정)
                // val steps = readSteps(client, startInstant, endInstant)
                // resultJson.put("steps", steps)

                // ... 심박, 체중, 운동, 영양, 수면 등 기존과 동일 ...

                call.resolve(resultJson)
            } catch (e: Exception) {
                call.reject("Failed to read summary for period: $type", e)
            }
        }
    }
}
