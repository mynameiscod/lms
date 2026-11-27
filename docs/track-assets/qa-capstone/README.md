# ShopSathi — the QA / SDET capstone's product under test

`shopsathi.py` is the reference demo app for the QA / SDET track capstone (`QA_CAPSTONE` in
`server/src/seeds/careerPilot/trackContentQaCapstone.ts`). The capstone notes tell students their mentor
shares it: give students this file.

- A Flask web app (pages) and a JSON API, in-memory data, synthetic users and products. Run it locally only:
  `python shopsathi.py --port 5055` (buggy build) or `python shopsathi.py --port 5055 --fixed`.
- It needs `flask`. Nine defects (SS-1 … SS-9) are planted on purpose; the list is in the capstone's DEFENCE
  unit, which students read after they hand in. `--fixed` builds the corrected version.
- The secret key and the passwords are fake demo values. Never deploy this app anywhere public.
