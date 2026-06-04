package com.zerointrusion.crypto

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyFactory
import java.security.PrivateKey
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PKCS8EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import java.nio.charset.StandardCharsets

class RsaOaepModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RsaOaepModule"

  @ReactMethod
  fun decryptAesKeyBase64(encryptedAesKeyBase64: String, privateKeyPem: String, promise: Promise) {
    try {
      val privateKey = parsePrivateKey(privateKeyPem)
      val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
      val oaep = OAEPParameterSpec(
        "SHA-256",
        "MGF1",
        MGF1ParameterSpec.SHA256,
        PSource.PSpecified.DEFAULT,
      )
      cipher.init(Cipher.DECRYPT_MODE, privateKey, oaep)

      val encryptedBytes = Base64.decode(encryptedAesKeyBase64, Base64.DEFAULT)
      val decryptedBytes = cipher.doFinal(encryptedBytes)
      val decryptedBase64 = Base64.encodeToString(decryptedBytes, Base64.NO_WRAP)
      promise.resolve(decryptedBase64)
    } catch (t: Throwable) {
      promise.reject("RSA_OAEP_DECRYPT_FAILED", t)
    }
  }

  @ReactMethod
  fun decryptAesGcmUtf8(
    encryptedDataBase64: String,
    aesKeyBase64: String,
    ivBase64: String,
    promise: Promise,
  ) {
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      val keyBytes = Base64.decode(aesKeyBase64, Base64.DEFAULT)
      val ivBytes = Base64.decode(ivBase64, Base64.DEFAULT)
      val encryptedBytes = Base64.decode(encryptedDataBase64, Base64.DEFAULT)

      val secretKey = javax.crypto.spec.SecretKeySpec(keyBytes, "AES")
      val gcmSpec = GCMParameterSpec(128, ivBytes)

      cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)
      val decryptedBytes = cipher.doFinal(encryptedBytes)
      promise.resolve(String(decryptedBytes, StandardCharsets.UTF_8))
    } catch (t: Throwable) {
      promise.reject("AES_GCM_DECRYPT_FAILED", t)
    }
  }

  private fun parsePrivateKey(privateKeyPem: String): PrivateKey {
    val normalizedPem = privateKeyPem.trim()
    val body = normalizedPem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace("-----BEGIN RSA PRIVATE KEY-----", "")
      .replace("-----END RSA PRIVATE KEY-----", "")
      .replace("\\s".toRegex(), "")

    val der = Base64.decode(body, Base64.DEFAULT)
    val pkcs8 = if (normalizedPem.contains("BEGIN RSA PRIVATE KEY")) {
      wrapPkcs1ToPkcs8(der)
    } else {
      der
    }

    val keySpec = PKCS8EncodedKeySpec(pkcs8)
    val keyFactory = KeyFactory.getInstance("RSA")
    return keyFactory.generatePrivate(keySpec)
  }

  private fun wrapPkcs1ToPkcs8(pkcs1: ByteArray): ByteArray {
    val version = byteArrayOf(0x02, 0x01, 0x00)
    val algorithmIdentifier = byteArrayOf(
      0x30, 0x0D,
      0x06, 0x09,
      0x2A, 0x86.toByte(), 0x48, 0x86.toByte(), 0xF7.toByte(), 0x0D, 0x01, 0x01, 0x01,
      0x05, 0x00,
    )
    val privateKeyOctetString = encodeTagAndLength(0x04, pkcs1)

    val content = ByteArray(version.size + algorithmIdentifier.size + privateKeyOctetString.size)
    System.arraycopy(version, 0, content, 0, version.size)
    System.arraycopy(algorithmIdentifier, 0, content, version.size, algorithmIdentifier.size)
    System.arraycopy(
      privateKeyOctetString,
      0,
      content,
      version.size + algorithmIdentifier.size,
      privateKeyOctetString.size,
    )

    return encodeTagAndLength(0x30, content)
  }

  private fun encodeTagAndLength(tag: Int, value: ByteArray): ByteArray {
    val lengthBytes = encodeLength(value.size)
    val out = ByteArray(1 + lengthBytes.size + value.size)
    out[0] = tag.toByte()
    System.arraycopy(lengthBytes, 0, out, 1, lengthBytes.size)
    System.arraycopy(value, 0, out, 1 + lengthBytes.size, value.size)
    return out
  }

  private fun encodeLength(length: Int): ByteArray {
    if (length < 128) {
      return byteArrayOf(length.toByte())
    }

    var temp = length
    val bytes = ArrayList<Byte>()
    while (temp > 0) {
      bytes.add(0, (temp and 0xFF).toByte())
      temp = temp ushr 8
    }

    val out = ByteArray(1 + bytes.size)
    out[0] = (0x80 or bytes.size).toByte()
    for (i in bytes.indices) {
      out[i + 1] = bytes[i]
    }
    return out
  }
}
