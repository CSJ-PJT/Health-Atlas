package com.danchon.healthsync

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var client: HealthConnectClient? = null
    private fun getClient(): HealthConnectClient {
        if (client == null) client = HealthConnectClient.getOrCreate(context)
        return client!!
    }

    // Permission flow
    private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null
    private var pendingPermissionCall: PluginCall? = null

    override fun load() {
        super.load()

        permissionLauncher = bridge.activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { _ ->
            val call = pendingPermissionCall
            pendingPermissionCall = null
            if (call != null) {
                scope.launch { resolvePermissionStatus(call) }
            }
        }
    }

    // ─────────────────────────────────────────────
    // Required permissions (READ only)
    // ─────────────────────────────────────────────
    private fun requiredReadPermissions(): Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),

        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),

        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(BodyFatRecord::class),

        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class)
    )

    @PluginMethod
    fun getStatus(call: PluginCall) {
        try {
            val status = HealthConnectClient.getSdkStatus(context)
            val statusText = when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "AVAILABLE"
                HealthConnectClient.SDK_UNAVAILABLE -> "UNAVAILABLE"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "PROVIDER_UPDATE_REQUIRED"
                else -> "UNKNOWN"
            }
            val res = JSObject()
            res.put("status", status)
            res.put("statusText", statusText)
            res.put("isAvailable", status == HealthConnectClient.SDK_AVAILABLE)
            call.resolve(res)
        } catch (e: Exception) {
            Log.e("HealthConnectPlugin", "getStatus error", e)
            call.reject("getStatus failed: ${e.message}")
        }
    }

    private fun ensureAvailableOrReject(call: PluginCall): Boolean {
        return try {
            val status = HealthConnectClient.getSdkStatus(context)
            if (status != HealthConnectClient.SDK_AVAILABLE) {
                val statusText = when (status) {
                    HealthConnectClient.SDK_UNAVAILABLE -> "UNAVAILABLE"
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "PROVIDER_UPDATE_REQUIRED"
                    else -> "UNKNOWN"
                }
                call.reject("HEALTH_CONNECT_NOT_AVAILABLE:$statusText")
                false
            } else true
        } catch (e: Exception) {
            call.reject("HEALTH_CONNECT_STATUS_ERROR:${e.message}")
            false
        }
    }

    @PluginMethod
    fun ping(call: PluginCall) {
        val obj = JSObject()
        obj.put("value", "pong")
        call.resolve(obj)
    }

    // ─────────────────────────────────────────────
    // permissions
    // ─────────────────────────────────────────────
    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        if (!ensureAvailableOrReject(call)) return
        scope.launch { resolvePermissionStatus(call) }
    }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        checkPermissions(call)
    }

    private suspend fun resolvePermissionStatus(call: PluginCall) {
        try {
            val c = getClient()
            val granted = c.permissionController.getGrantedPermissions()
            val required = requiredReadPermissions()

            val missing = required.filter { !granted.contains(it) }

            val res = JSObject()
            res.put("hasAll", missing.isEmpty())
            res.put("hasAllPermissions", missing.isEmpty())
            res.put("requiredCount", required.size)
            res.put("grantedCount", granted.count { required.contains(it) })

            val grantedArr = JSArray()
            granted.forEach { grantedArr.put(it) }
            res.put("granted", grantedArr)

            val missingArr = JSArray()
            missing.forEach { missingArr.put(it) }
            res.put("missing", missingArr)

            call.resolve(res)
        } catch (e: Exception) {
            Log.e("HealthConnectPlugin", "checkPermissions error", e)
            call.reject("checkPermissions failed: ${e.message}")
        }
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (!ensureAvailableOrReject(call)) return

        try {
            pendingPermissionCall = call
            val required = requiredReadPermissions()

            bridge.activity.runOnUiThread {
                permissionLauncher?.launch(required)
            }
        } catch (e: Exception) {
            Log.e("HealthConnectPlugin", "requestPermissions error", e)
            call.reject("requestPermissions failed: ${e.message}")
        }
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:com.google.android.apps.healthdata")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            val res = JSObject()
            res.put("opened", true)
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("openHealthConnectSettings failed: ${e.message}")
        }
    }

    // ─────────────────────────────────────────────
    // readSummary(period)
    // ─────────────────────────────────────────────
    @PluginMethod
    fun readSummary(call: PluginCall) {
        if (!ensureAvailableOrReject(call)) return

        val period = call.getString("period") ?: "today"

        // optional: filter by data origin packages
        val originPackages = mutableListOf<String>()
        call.getArray("dataOriginPackages")?.let { arr ->
            for (i in 0 until arr.length()) {
                val p = arr.getString(i)
                if (!p.isNullOrBlank()) originPackages.add(p)
            }
        }
        call.getString("dataOriginPackage")?.let { p ->
            if (!p.isNullOrBlank()) originPackages.add(p)
        }

        val originFilter: Set<DataOrigin>? =
            if (originPackages.isNotEmpty()) originPackages.map { DataOrigin(it) }.toSet()
            else null

        scope.launch {
            try {
                val (start, end) = resolvePeriod(period)
                val summary = buildSummary(start, end, originFilter)
                call.resolve(summary)
            } catch (e: Exception) {
                Log.e("HealthConnectPlugin", "readSummary error", e)
                call.reject("readSummary failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getTodaySnapshot(call: PluginCall) {
        if (!ensureAvailableOrReject(call)) return

        scope.launch {
            try {
                val (start, end) = resolvePeriod("today")
                val snapshot = buildTodaySnapshot(start, end, null)
                call.resolve(snapshot)
            } catch (e: Exception) {
                Log.e("HealthConnectPlugin", "getTodaySnapshot error", e)
                call.reject("getTodaySnapshot failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getSnapshotForRange(call: PluginCall) {
        if (!ensureAvailableOrReject(call)) return

        val startIso = call.getString("start")
        val endIso = call.getString("end")

        if (startIso.isNullOrBlank() || endIso.isNullOrBlank()) {
            call.reject("getSnapshotForRange requires start and end")
            return
        }

        scope.launch {
            try {
                val snapshot = buildTodaySnapshot(
                    Instant.parse(startIso),
                    Instant.parse(endIso),
                    null
                )
                call.resolve(snapshot)
            } catch (e: Exception) {
                Log.e("HealthConnectPlugin", "getSnapshotForRange error", e)
                call.reject("getSnapshotForRange failed: ${e.message}")
            }
        }
    }

    private fun resolvePeriod(period: String): Pair<Instant, Instant> {
        val nowZoned: ZonedDateTime = Instant.now().atZone(ZoneId.systemDefault())
        return when (period) {
            "today" -> {
                val start = nowZoned.toLocalDate().atStartOfDay(nowZoned.zone).toInstant()
                Pair(start, nowZoned.toInstant())
            }
            "week" -> {
                val start = nowZoned.with(java.time.DayOfWeek.MONDAY)
                    .toLocalDate().atStartOfDay(nowZoned.zone).toInstant()
                Pair(start, nowZoned.toInstant())
            }
            "month" -> {
                val start = nowZoned.withDayOfMonth(1)
                    .toLocalDate().atStartOfDay(nowZoned.zone).toInstant()
                Pair(start, nowZoned.toInstant())
            }
            "year" -> {
                val start = nowZoned.withDayOfYear(1)
                    .toLocalDate().atStartOfDay(nowZoned.zone).toInstant()
                Pair(start, nowZoned.toInstant())
            }
            else -> {
                val start = nowZoned.toLocalDate().atStartOfDay(nowZoned.zone).toInstant()
                Pair(start, nowZoned.toInstant())
            }
        }
    }

    private suspend fun buildSummary(start: Instant, end: Instant, originFilter: Set<DataOrigin>?): JSObject {
        val c = getClient()
        val range = TimeRangeFilter.between(start, end)

        val metrics = setOf(
            StepsRecord.COUNT_TOTAL,
            DistanceRecord.DISTANCE_TOTAL,
            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
            TotalCaloriesBurnedRecord.ENERGY_TOTAL
        )

        val agg = if (originFilter != null && originFilter.isNotEmpty()) {
            c.aggregate(
                AggregateRequest(
                    metrics = metrics,
                    timeRangeFilter = range,
                    dataOriginFilter = originFilter
                )
            )
        } else {
            c.aggregate(
                AggregateRequest(
                    metrics = metrics,
                    timeRangeFilter = range
                )
            )
        }

        val totalSteps = agg[StepsRecord.COUNT_TOTAL] ?: 0L
        val distanceMeter = agg[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0

        var activeCaloriesKcal: Double =
            agg[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0

        val totalBurnedCaloriesKcal: Double =
            agg[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0

        // 1) fallback: sum ActiveCaloriesBurnedRecord records (providers sometimes don't aggregate)
        if (activeCaloriesKcal == 0.0) {
            val rec = c.readRecords(
                ReadRecordsRequest(
                    ActiveCaloriesBurnedRecord::class,
                    TimeRangeFilter.between(start, end)
                )
            )
            activeCaloriesKcal = rec.records
                .asSequence()
                .filter { matchesOrigin(originFilter, it.metadata.dataOrigin) }
                .sumOf { it.energy.inKilocalories }
        }

        // 2) 최종 fallback: Samsung Health가 Active를 Health Connect에 안쓰는 케이스가 존재함
        // -> 0으로 UI가 망가지는 것 방지용 (출처 플래그를 같이 내려서 UI에서 표시/라벨링 가능)
        val activeCaloriesSource: String
        if (activeCaloriesKcal > 0.0) {
            activeCaloriesSource = "ACTIVE_CALORIES"
        } else if (totalBurnedCaloriesKcal > 0.0) {
            activeCaloriesKcal = totalBurnedCaloriesKcal
            activeCaloriesSource = "TOTAL_BURNED_FALLBACK"
        } else {
            activeCaloriesSource = "NONE"
        }

        // details
        val heartRateArr = readHeartRate(c, start, end, originFilter)
        val bodyObj = readBody(c, start, end, originFilter)
        val (sleepSessionsArr, sleepMinutes) = readSleep(c, start, end, originFilter)
        val (nutritionArr, totalIntakeKcal) = readNutrition(c, start, end, originFilter)
        val exercisesArr = readExercises(c, start, end, originFilter)

        // Active time: walk/run/treadmill-run sessions duration sum
        val activeTimeMinutes = computeActiveTimeMinutes(exercisesArr)

        // steps array (1건)
        val stepsArray = JSArray().apply {
            val o = JSObject()
            o.put("count", totalSteps)
            o.put("startTime", start.toString())
            o.put("endTime", end.toString())
            put(o)
        }

        val out = JSObject()
        out.put("steps", stepsArray)
        out.put("totalSteps", totalSteps)
        out.put("distanceMeter", distanceMeter)

        out.put("activeCaloriesKcal", activeCaloriesKcal)
        out.put("activeCaloriesSource", activeCaloriesSource)
        out.put("totalBurnedCaloriesKcal", totalBurnedCaloriesKcal)

        out.put("heartRate", heartRateArr)
        out.put("body", bodyObj)

        out.put("exercises", exercisesArr)
        out.put("sleepSessions", sleepSessionsArr)
        out.put("nutrition", nutritionArr)

        out.put("totalIntakeKcal", totalIntakeKcal)
        out.put("sleepMinutes", sleepMinutes)

        out.put("exerciseMinutes", activeTimeMinutes)
        out.put("exerciseDistanceMeter", 0.0)

        return out
    }

    private suspend fun buildTodaySnapshot(start: Instant, end: Instant, originFilter: Set<DataOrigin>?): JSObject {
        val summary = buildSummary(start, end, originFilter)

        val aggregate = JSObject().apply {
            put("steps", summary.getLong("totalSteps"))
            put("distanceMeter", summary.getDouble("distanceMeter"))
            put("activeCaloriesKcal", summary.getDouble("activeCaloriesKcal"))
            put("exerciseDurationMinutes", summary.getLong("exerciseMinutes"))
            put("sleepDurationMinutes", summary.getDouble("sleepMinutes"))
        }

        val exerciseSessions = JSArray()
        val exercises = summary.getJSONArray("exercises")
        for (i in 0 until exercises.length()) {
            val exercise = exercises.getJSONObject(i)
            exerciseSessions.put(
                JSObject().apply {
                    put("title", exercise.optString("title", "Exercise"))
                    put("exerciseType", exercise.optInt("exerciseType", -1))
                    put("startTime", exercise.getString("startTime"))
                    put("endTime", exercise.getString("endTime"))
                    put("durationMinutes", exercise.optLong("durationMinutes", 0L))
                    put("distanceMeter", exercise.optDouble("distanceMeter", 0.0))
                    put("caloriesKcal", exercise.optDouble("caloriesKcal", 0.0))
                }
            )
        }

        val sleepSessions = JSArray()
        val sleeps = summary.getJSONArray("sleepSessions")
        for (i in 0 until sleeps.length()) {
            val sleep = sleeps.getJSONObject(i)
            sleepSessions.put(
                JSObject().apply {
                    put("title", JSONObject.NULL)
                    put("startTime", sleep.getString("startTime"))
                    put("endTime", sleep.getString("endTime"))
                    put("notes", JSONObject.NULL)
                    put("durationMinutes", sleep.optDouble("durationMinutes", 0.0))
                }
            )
        }

        val body = summary.getJSONObject("body")
        val weight = JSArray()
        val weightSource = body.getJSONArray("weight")
        for (i in 0 until weightSource.length()) {
            val item = weightSource.getJSONObject(i)
            weight.put(
                JSObject().apply {
                    put("time", item.getString("time"))
                    put("weightKg", item.optDouble("kg", 0.0))
                }
            )
        }

        val bodyFat = JSArray()
        val bodyFatSource = body.getJSONArray("bodyFat")
        for (i in 0 until bodyFatSource.length()) {
            val item = bodyFatSource.getJSONObject(i)
            bodyFat.put(
                JSObject().apply {
                    put("time", item.getString("time"))
                    put("percentage", item.optDouble("percentage", 0.0))
                }
            )
        }

        val nutrition = JSArray()
        val nutritionSource = summary.getJSONArray("nutrition")
        for (i in 0 until nutritionSource.length()) {
            val item = nutritionSource.getJSONObject(i)
            nutrition.put(
                JSObject().apply {
                    put("startTime", item.getString("time"))
                    put("endTime", item.getString("time"))
                    put("mealType", 0)
                    put("name", "Nutrition")
                    put("energyKcal", item.optDouble("energyKcal", 0.0))
                    put("proteinGrams", item.optDouble("proteinGrams", 0.0))
                    put("fatGrams", item.optDouble("fatGrams", 0.0))
                    put("carbsGrams", item.optDouble("carbsGrams", 0.0))
                }
            )
        }

        return JSObject().apply {
            put("aggregate", aggregate)
            put("heartRate", summary.getJSONArray("heartRate"))
            put("exerciseSessions", exerciseSessions)
            put("sleepSessions", sleepSessions)
            put(
                "sleepStageSummary",
                JSObject().apply {
                    put("deepMinutes", 0)
                    put("lightMinutes", 0)
                    put("remMinutes", 0)
                    put("awakeMinutes", 0)
                }
            )
            put("weight", weight)
            put("bodyFat", bodyFat)
            put("vo2max", JSArray())
            put("hydration", JSArray())
            put("nutrition", nutrition)
        }
    }

    private fun computeActiveTimeMinutes(exercisesArr: JSArray): Long {
        var total = 0L
        for (i in 0 until exercisesArr.length()) {
            val obj = exercisesArr.getJSONObject(i)
            val type = obj.optInt("exerciseType", -1)
            val minutes = obj.optLong("durationMinutes", 0L)

            val isWalkRun =
                type == ExerciseSessionRecord.EXERCISE_TYPE_WALKING ||
                        type == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING ||
                        type == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL

            if (isWalkRun) total += minutes
        }
        return total
    }

    // ─────────────────────────────────────────────
    // Readers
    // ─────────────────────────────────────────────
    private fun matchesOrigin(originFilter: Set<DataOrigin>?, recordOrigin: DataOrigin): Boolean {
        if (originFilter == null || originFilter.isEmpty()) return true
        return originFilter.contains(recordOrigin)
    }

    private suspend fun readHeartRate(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
        originFilter: Set<DataOrigin>?
    ): JSArray {
        val res = c.readRecords(
            ReadRecordsRequest(HeartRateRecord::class, TimeRangeFilter.between(start, end))
        )

        val arr = JSArray()
        for (record in res.records) {
            if (!matchesOrigin(originFilter, record.metadata.dataOrigin)) continue
            for (sample in record.samples) {
                val obj = JSObject()
                obj.put("bpm", sample.beatsPerMinute)
                obj.put("time", sample.time.toString())
                arr.put(obj)
            }
        }
        return arr
    }

    private suspend fun readBody(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
        originFilter: Set<DataOrigin>?
    ): JSObject {
        val weightArr = JSArray()
        val bodyFatArr = JSArray()

        val w = c.readRecords(ReadRecordsRequest(WeightRecord::class, TimeRangeFilter.between(start, end)))
        for (r in w.records) {
            if (!matchesOrigin(originFilter, r.metadata.dataOrigin)) continue
            val obj = JSObject()
            obj.put("kg", r.weight.inKilograms)
            obj.put("time", r.time.toString())
            weightArr.put(obj)
        }

        val f = c.readRecords(ReadRecordsRequest(BodyFatRecord::class, TimeRangeFilter.between(start, end)))
        for (r in f.records) {
            if (!matchesOrigin(originFilter, r.metadata.dataOrigin)) continue
            val obj = JSObject()
            obj.put("percentage", r.percentage)
            obj.put("time", r.time.toString())
            bodyFatArr.put(obj)
        }

        val body = JSObject()
        body.put("weight", weightArr)
        body.put("bodyFat", bodyFatArr)
        return body
    }

    private suspend fun readSleep(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
        originFilter: Set<DataOrigin>?
    ): Pair<JSArray, Double> {
        val res = c.readRecords(
            ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(start, end))
        )

        val arr = JSArray()
        var totalMinutes = 0.0

        for (r in res.records) {
            if (!matchesOrigin(originFilter, r.metadata.dataOrigin)) continue
            val obj = JSObject()
            obj.put("startTime", r.startTime.toString())
            obj.put("endTime", r.endTime.toString())

            val minutes = (r.endTime.toEpochMilli() - r.startTime.toEpochMilli()) / 60000.0
            obj.put("durationMinutes", minutes)

            totalMinutes += minutes
            arr.put(obj)
        }
        return Pair(arr, totalMinutes)
    }

    private suspend fun readNutrition(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
        originFilter: Set<DataOrigin>?
    ): Pair<JSArray, Double> {
        val res = c.readRecords(
            ReadRecordsRequest(NutritionRecord::class, TimeRangeFilter.between(start, end))
        )

        val arr = JSArray()
        var totalKcal = 0.0

        for (r in res.records) {
            if (!matchesOrigin(originFilter, r.metadata.dataOrigin)) continue

            val obj = JSObject()
            obj.put("time", r.startTime.toString())
            val kcal = r.energy?.inKilocalories ?: 0.0
            obj.put("energyKcal", kcal)
            obj.put("proteinGrams", r.protein?.inGrams ?: 0.0)
            obj.put("fatGrams", r.totalFat?.inGrams ?: 0.0)
            obj.put("carbsGrams", 0.0)

            arr.put(obj)
            totalKcal += kcal
        }

        return Pair(arr, totalKcal)
    }

    private suspend fun readExercises(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
        originFilter: Set<DataOrigin>?
    ): JSArray {
        val res = c.readRecords(
            ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.between(start, end))
        )

        val arr = JSArray()
        for (r in res.records) {
            if (!matchesOrigin(originFilter, r.metadata.dataOrigin)) continue

            val obj = JSObject()
            obj.put("title", r.title ?: "Exercise")
            obj.put("exerciseType", r.exerciseType)
            obj.put("startTime", r.startTime.toString())
            obj.put("endTime", r.endTime.toString())

            val minutes = ((r.endTime.toEpochMilli() - r.startTime.toEpochMilli()) / 60000L)
            obj.put("durationMinutes", minutes)

            obj.put("distanceMeter", 0.0)
            obj.put("caloriesKcal", 0.0)

            arr.put(obj)
        }
        return arr
    }
}
