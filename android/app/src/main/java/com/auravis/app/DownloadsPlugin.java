package com.auravis.app;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "Downloads")
public class DownloadsPlugin extends Plugin {
    private final Map<String, PendingFile> pendingFiles = new ConcurrentHashMap<>();

    @PluginMethod
    public void beginSave(PluginCall call) {
        String fileName = safeFileName(call.getString("fileName", "auravis-export.webm"));
        String mimeType = call.getString("mimeType", "video/webm");
        if (!mimeType.startsWith("video/")) {
            call.reject("The export must have a video MIME type.");
            return;
        }
        if (call.getBoolean("useSaf", false) || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mimeType)
                .putExtra(Intent.EXTRA_TITLE, fileName);
            startActivityForResult(call, intent, "saveDocumentResult");
        } else {
            createSave(call, fileName, mimeType, null, false);
        }
    }

    @ActivityCallback
    private void saveDocumentResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("The save location was not selected.");
            return;
        }
        Uri uri = result.getData().getData();
        try {
            int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if (flags != 0) getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (SecurityException ignored) {
            // Some document providers grant a temporary URI permission only.
        }
        createSave(call, safeFileName(call.getString("fileName", "auravis-export.webm")),
            call.getString("mimeType", "video/webm"), uri, true);
    }

    private void createSave(PluginCall call, String fileName, String mimeType, Uri selectedUri, boolean saf) {
        Uri uri = null;
        OutputStream stream = null;
        boolean mediaStoreFile = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !saf;
        try {
            String location;
            if (saf) {
                uri = selectedUri;
                stream = getContext().getContentResolver().openOutputStream(uri, "w");
                String path = uri.getLastPathSegment();
                int volumeSeparator = path == null ? -1 : path.indexOf(':');
                location = path == null ? "Selected location" : Uri.decode(volumeSeparator < 0 ? path : path.substring(volumeSeparator + 1));
            } else if (mediaStoreFile) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/Auravis");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                uri = getContext().getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("Android could not create a Movies file.");
                stream = getContext().getContentResolver().openOutputStream(uri, "w");
                location = "Movies/Auravis/" + fileName;
            } else {
                File movies = getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES);
                if (movies == null) throw new IOException("Android storage is unavailable.");
                File directory = new File(movies, "Auravis");
                if (!directory.exists() && !directory.mkdirs()) throw new IOException("Could not create the app's Movies folder.");
                File file = new File(directory, fileName);
                uri = Uri.fromFile(file);
                stream = new FileOutputStream(file);
                location = "Android/data/" + getContext().getPackageName() + "/files/Movies/Auravis/" + fileName;
            }

            if (stream == null) throw new IOException("Android could not open the export file.");
            String id = UUID.randomUUID().toString();
            pendingFiles.put(id, new PendingFile(uri, stream, mediaStoreFile, location, saf));
            JSObject response = new JSObject();
            response.put("id", id);
            response.put("location", location);
            call.resolve(response);
        } catch (Exception error) {
            String message = "Could not create the export file: " + error.getMessage();
            try {
                if (stream != null) stream.close();
                if (uri != null) deleteFile(new PendingFile(uri, null, mediaStoreFile, "", saf));
            } catch (Exception cleanupError) {
                message += "; cleanup failed: " + cleanupError.getMessage();
            }
            call.reject(message, error);
        }
    }

    @PluginMethod
    public void writeChunk(PluginCall call) {
        String id = call.getString("id");
        String data = call.getString("data");
        PendingFile file = id == null ? null : pendingFiles.get(id);
        if (file == null || data == null) {
            call.reject("The export file or data chunk is missing.");
            return;
        }
        try {
            byte[] chunk = Base64.decode(data, Base64.DEFAULT);
            file.stream.write(chunk);
            file.bytesWritten += chunk.length;
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not write the export file: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        String id = call.getString("id");
        PendingFile file = id == null ? null : pendingFiles.remove(id);
        if (file == null) {
            call.reject("The export file is no longer available.");
            return;
        }
        try {
            if (file.bytesWritten <= 0) throw new IOException("The exported video is empty.");
            file.stream.flush();
            file.stream.close();
            if (file.mediaStoreFile) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (getContext().getContentResolver().update(file.uri, values, null, null) != 1) {
                    throw new IOException("Android could not publish the completed export.");
                }
            }
            JSObject response = new JSObject();
            response.put("location", file.location);
            response.put("uri", shareableUri(file.uri).toString());
            call.resolve(response);
        } catch (Exception error) {
            String message = "Could not finish saving the export: " + error.getMessage();
            try {
                deleteFile(file);
            } catch (Exception cleanupError) {
                message += "; cleanup failed: " + cleanupError.getMessage();
            }
            call.reject(message, error);
        }
    }

    @PluginMethod
    public void abortSave(PluginCall call) {
        String id = call.getString("id");
        PendingFile file = id == null ? null : pendingFiles.remove(id);
        if (file == null) {
            call.resolve();
            return;
        }
        try {
            file.stream.close();
            deleteFile(file);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not remove the incomplete export: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void openExport(PluginCall call) {
        openWithIntent(call, Intent.ACTION_VIEW);
    }

    @PluginMethod
    public void shareExport(PluginCall call) {
        openWithIntent(call, Intent.ACTION_SEND);
    }

    private void openWithIntent(PluginCall call, String action) {
        String value = call.getString("uri");
        String mimeType = call.getString("mimeType", "video/mp4");
        if (value == null || value.isEmpty()) {
            call.reject("The saved video location is missing.");
            return;
        }
        try {
            Uri uri = shareableUri(Uri.parse(value));
            Intent intent = Intent.ACTION_SEND.equals(action)
                ? new Intent(action).setType(mimeType).putExtra(Intent.EXTRA_STREAM, uri)
                : new Intent(action).setDataAndType(uri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(android.content.ClipData.newUri(getContext().getContentResolver(), "Auravis video", uri));
            getActivity().startActivity(Intent.createChooser(intent, Intent.ACTION_SEND.equals(action) ? "Share video" : "Open video"));
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open the exported video: " + error.getMessage(), error);
        }
    }

    private Uri shareableUri(Uri uri) throws IOException {
        if ("file".equals(uri.getScheme())) {
            return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", new File(uri.getPath()));
        }
        return uri;
    }

    private void deleteFile(PendingFile file) throws IOException {
        if (file.mediaStoreFile || file.saf) {
            if (getContext().getContentResolver().delete(file.uri, null, null) != 1) {
                throw new IOException("Android could not remove the incomplete export.");
            }
        } else {
            File path = new File(file.uri.getPath());
            if (path.exists() && !path.delete()) throw new IOException("Android could not remove the incomplete export.");
        }
    }

    private String safeFileName(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) return "auravis-export.webm";
        return new File(fileName).getName().replaceAll("[^A-Za-z0-9._ -]", "_");
    }

    private static final class PendingFile {
        final Uri uri;
        final OutputStream stream;
        final boolean mediaStoreFile;
        final String location;
        final boolean saf;
        long bytesWritten;

        PendingFile(Uri uri, OutputStream stream, boolean mediaStoreFile, String location, boolean saf) {
            this.uri = uri;
            this.stream = stream;
            this.mediaStoreFile = mediaStoreFile;
            this.location = location;
            this.saf = saf;
        }
    }
}
