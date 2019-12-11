<?php

/*
 * Copyright ViksTech di Vittorio Domenico Padiglia.
 * Se non hai pagato per l'uso o la modifica di questi sorgenti, hai il dovere di cancellarli
 * Il possesso e l'uso, o la copia, di questo codice non consentito è punibile per legge.
 */


$data = file_get_contents("php://input") ?? null;

if (!$data) {
    die(json_encode(['error' => true, 'text' => 'no_data']));
}


try {
    $data = json_decode($data, 1);
    $error = null;
    switch (json_last_error()) {
        case JSON_ERROR_NONE:
            $error = null;
            break;
        case JSON_ERROR_DEPTH:
            $error = ' - Maximum stack depth exceeded';
            break;
        case JSON_ERROR_STATE_MISMATCH:
            $error = ' - Underflow or the modes mismatch';
            break;
        case JSON_ERROR_CTRL_CHAR:
            $error = ' - Unexpected control character found';
            break;
        case JSON_ERROR_SYNTAX:
            $error = ' - Syntax error, malformed JSON';
            break;
        case JSON_ERROR_UTF8:
            $error = ' - Malformed UTF-8 characters, possibly incorrectly encoded';
            break;
        default:
            $error = ' - Unknown error';
            break;
    }

    if ($error) {
        throw new Exception($error);
    }

    if (!file_put_contents('questions.json', json_encode($data))) {
        throw new Exception('File domande bloccato');
    }
    die(json_encode(['error' => false, 'text' => true]));
} catch (Exception $ex) {
    die(json_encode(['error' => true, 'text' => $ex->getMessage()]));
}


        
