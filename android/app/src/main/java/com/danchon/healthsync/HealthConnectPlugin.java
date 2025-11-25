package com.danchon.healthsync;

import android.content.Intent;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.*;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.time.TimeRangeFilter;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;
import java.util.*;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    
    private HealthConnectClient healthConnectClient;
    private static final int HEALTH_CONNECT_PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void load() {
        super.load();
        if (HealthConnectClient.isAvailable(getContext())) {
            healthConnectClient = HealthConnectClient.getOrCreate(getContext());
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", HealthConnectClient.isAvailable(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect is not available on this device");
            return;
        }

        try {
            Set<HealthPermission> permissions = new HashSet<>();
            
            // Add all read permissions
            permissions.add(HealthPermission.createReadPermission(StepsRecord.class));
            permissions.add(HealthPermission.createReadPermission(HeartRateRecord.class));
            permissions.add(HealthPermission.createReadPermission(SleepSessionRecord.class));
            permissions.add(HealthPermission.createReadPermission(ExerciseSessionRecord.class));
            permissions.add(HealthPermission.createReadPermission(NutritionRecord.class));
            permissions.add(HealthPermission.createReadPermission(WeightRecord.class));
            permissions.add(HealthPermission.createReadPermission(BodyFatRecord.class));
            permissions.add(HealthPermission.createReadPermission(BloodPressureRecord.class));
            
            // Add all write permissions
            permissions.add(HealthPermission.createWritePermission(StepsRecord.class));
            permissions.add(HealthPermission.createWritePermission(HeartRateRecord.class));
            permissions.add(HealthPermission.createWritePermission(SleepSessionRecord.class));
            permissions.add(HealthPermission.createWritePermission(ExerciseSessionRecord.class));
            permissions.add(HealthPermission.createWritePermission(NutritionRecord.class));
            permissions.add(HealthPermission.createWritePermission(WeightRecord.class));
            permissions.add(HealthPermission.createWritePermission(BodyFatRecord.class));
            permissions.add(HealthPermission.createWritePermission(BloodPressureRecord.class));

            Intent intent = PermissionController.createRequestPermissionResultContract()
                    .createIntent(getContext(), permissions);
            
            startActivityForResult(call, intent, HEALTH_CONNECT_PERMISSION_REQUEST_CODE);
            
        } catch (Exception e) {
            call.reject("Failed to request permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect is not available on this device");
            return;
        }

        try {
            Set<HealthPermission> permissions = new HashSet<>();
            permissions.add(HealthPermission.createReadPermission(StepsRecord.class));
            permissions.add(HealthPermission.createReadPermission(HeartRateRecord.class));
            permissions.add(HealthPermission.createReadPermission(SleepSessionRecord.class));

            Set<HealthPermission> granted = healthConnectClient.getGrantedPermissions(permissions).get();
            
            JSObject ret = new JSObject();
            JSObject grantedObj = new JSObject();
            for (HealthPermission permission : permissions) {
                grantedObj.put(permission.toString(), granted.contains(permission));
            }
            ret.put("granted", grantedObj);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject("Failed to check permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readHealthData(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect is not available on this device");
            return;
        }

        try {
            String startTimeStr = call.getString("startTime");
            String endTimeStr = call.getString("endTime");
            
            Instant startTime = Instant.parse(startTimeStr);
            Instant endTime = Instant.parse(endTimeStr);
            
            TimeRangeFilter timeRangeFilter = new TimeRangeFilter.Builder()
                    .setStartTime(startTime)
                    .setEndTime(endTime)
                    .build();

            JSObject healthData = new JSObject();
            
            // Read steps data
            ReadRecordsRequest<StepsRecord> stepsRequest = new ReadRecordsRequest.Builder<>(
                    StepsRecord.class)
                    .setTimeRangeFilter(timeRangeFilter)
                    .build();
            
            List<StepsRecord> stepsRecords = healthConnectClient.readRecords(stepsRequest).get().getRecords();
            long totalSteps = 0;
            for (StepsRecord record : stepsRecords) {
                totalSteps += record.getCount();
            }
            healthData.put("steps", totalSteps);

            // Read heart rate data
            ReadRecordsRequest<HeartRateRecord> heartRateRequest = new ReadRecordsRequest.Builder<>(
                    HeartRateRecord.class)
                    .setTimeRangeFilter(timeRangeFilter)
                    .build();
            
            List<HeartRateRecord> heartRateRecords = healthConnectClient.readRecords(heartRateRequest).get().getRecords();
            if (!heartRateRecords.isEmpty()) {
                long avgHeartRate = 0;
                for (HeartRateRecord record : heartRateRecords) {
                    if (!record.getSamples().isEmpty()) {
                        avgHeartRate += record.getSamples().get(0).getBeatsPerMinute();
                    }
                }
                healthData.put("heartRate", avgHeartRate / heartRateRecords.size());
            }

            // Read sleep data
            ReadRecordsRequest<SleepSessionRecord> sleepRequest = new ReadRecordsRequest.Builder<>(
                    SleepSessionRecord.class)
                    .setTimeRangeFilter(timeRangeFilter)
                    .build();
            
            List<SleepSessionRecord> sleepRecords = healthConnectClient.readRecords(sleepRequest).get().getRecords();
            long totalSleepMinutes = 0;
            for (SleepSessionRecord record : sleepRecords) {
                totalSleepMinutes += java.time.Duration.between(record.getStartTime(), record.getEndTime()).toMinutes();
            }
            healthData.put("sleepHours", totalSleepMinutes / 60.0);

            JSObject ret = new JSObject();
            ret.put("data", healthData);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject("Failed to read health data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void writeHealthData(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect is not available on this device");
            return;
        }

        try {
            JSObject data = call.getObject("data");
            List<Record> records = new ArrayList<>();

            if (data.has("steps")) {
                Instant now = Instant.now();
                StepsRecord stepsRecord = new StepsRecord.Builder(
                        now.minusSeconds(3600),
                        now,
                        data.getInteger("steps")
                ).build();
                records.add(stepsRecord);
            }

            healthConnectClient.insertRecords(records).get();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject("Failed to write health data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAggregatedData(PluginCall call) {
        // Implement aggregated data logic here
        // Similar to readHealthData but with aggregation
        readHealthData(call);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        
        if (requestCode == HEALTH_CONNECT_PERMISSION_REQUEST_CODE) {
            PluginCall savedCall = getSavedCall();
            if (savedCall != null) {
                JSObject ret = new JSObject();
                ret.put("granted", resultCode == android.app.Activity.RESULT_OK);
                savedCall.resolve(ret);
            }
        }
    }
}
