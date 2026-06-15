<?php

use Illuminate\Support\Facades\Broadcast;

// Dashboard real-time updates channel
Broadcast::channel('dashboard.{dashboardSlug}', function ($user, $dashboardSlug) {
    return true; // Auth logic: check user has access to dashboard
});

// Dataset processing progress
Broadcast::channel('dataset.{datasetId}', function ($user, $datasetId) {
    return true;
});
