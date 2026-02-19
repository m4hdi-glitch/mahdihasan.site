<?php
  $state = isset($_GET['state']) ? $_GET['state'] : 'off';
  $state = ($state === 'on') ? 'on' : 'off';
  $json  = json_encode(['light' => $state]);
  file_put_contents(__DIR__ . '/lights.json', $json);
  echo 'ok';
?>
```

Then test it by visiting this in your browser:
```
https://mahdihasan.site/set_light.php?state=on
```
It should say `ok` and if you then open `lights.json` it should now show `{"light":"on"}`.

Then try:
```
https://mahdihasan.site/set_light.php?state=off
