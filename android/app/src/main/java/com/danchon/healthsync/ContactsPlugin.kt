package com.danchon.healthsync

import android.Manifest
import android.provider.ContactsContract
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(
    name = "DeviceContacts",
    permissions = [
        Permission(
            strings = [Manifest.permission.READ_CONTACTS],
            alias = "contacts"
        )
    ]
)
class ContactsPlugin : Plugin() {

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        val status = JSObject()
        status.put("granted", getPermissionState("contacts") == PermissionState.GRANTED)
        call.resolve(status)
    }

    @PluginMethod
    fun requestContactsPermission(call: PluginCall) {
        requestPermissionForAlias("contacts", call, "contactsPermissionCallback")
    }

    @PluginMethod
    fun getContacts(call: PluginCall) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            call.reject("CONTACTS_PERMISSION_NOT_GRANTED")
            return
        }

        val contacts = JSArray()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )

        val seen = mutableSetOf<String>()

        activity.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC"
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

            while (cursor.moveToNext()) {
                val id = cursor.getString(idIndex) ?: continue
                val name = cursor.getString(nameIndex) ?: "이름 없음"
                val phone = cursor.getString(numberIndex) ?: continue
                val normalizedPhone = phone.replace("\\s".toRegex(), "")
                val uniqueKey = "$id-$normalizedPhone"

                if (seen.contains(uniqueKey)) {
                    continue
                }
                seen.add(uniqueKey)

                val item = JSObject()
                item.put("id", id)
                item.put("name", name)
                item.put("phone", normalizedPhone)
                contacts.put(item)
            }
        }

        val result = JSObject()
        result.put("contacts", contacts)
        call.resolve(result)
    }

    @Suppress("unused")
    private fun contactsPermissionCallback(call: PluginCall) {
        val result = JSObject()
        result.put("granted", getPermissionState("contacts") == PermissionState.GRANTED)
        call.resolve(result)
    }
}
