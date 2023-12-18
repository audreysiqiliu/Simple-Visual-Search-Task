<?php
date_default_timezone_set('America/New_York');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    exit();
}

$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput, true);

if (empty($data)) {
    echo "empty";
    exit();
}

$workerId = isset($data['assignmentId']) ? $data['assignmentId'] : 'unknown';
$experimentName = isset($data['experimentName']) ? $data['experimentName'] : 'no_experiment_name';
$version = isset($data['version']) ? $data['version'] : 'no_version';
$timestamp = (new DateTime())->format('Y-m-d_H-i-s'); 

$dirPath = "/var/www/html/data/{$experimentName}_{$version}";
if (!is_dir($dirPath)) {
    mkdir($dirPath, 0777, true); // 0777 ensures you have writing permission
}

$filePath = "{$dirPath}/{$experimentName}_{$workerId}_{$timestamp}.json";

$result = file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));

if ($result) {
    echo "success";
} else {
    // log errors for debugging
    error_log("Failed to write to file: $filePath");
    error_log("PHP Error: " . json_encode(error_get_last()));
    
    echo "failure";
}

exit();

?>
