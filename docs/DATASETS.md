# Damage Detection Datasets (Roboflow Universe)

All datasets below are free / open-source on Roboflow Universe. Roboflow gives
1,000 free source images and free API calls on the public plan, which is enough
for a capstone-scale model.

## How to get a free API key
1. Sign up at https://roboflow.com (free tier)
2. Go to Settings → API Keys → copy your **Private API Key**
3. Paste it into `ml/scripts/.env` as `ROBOFLOW_API_KEY=...` (never commit this file)

## Direct download links (manual download)

Open each link, click **Download Dataset** (top right of the page), choose
format **YOLOv8**, then **"download zip to computer"**. Unzip into the path
shown so `merge_datasets.py` can find it automatically.

| Category | Dataset | Link | Unzip into |
|---|---|---|---|
| Phones | Mobile Damage Diagnosis (1,901 img) | https://universe.roboflow.com/abhinavpoc/mobile-damage-diagnosis | `ml/datasets/phones/mobile-damage-diagnosis/` |
| Phones | Cracked Screen (300 img) | https://universe.roboflow.com/abhinavpoc/cracked-screen | `ml/datasets/phones/cracked-screen/` |
| Laptops | Broken Laptop Parts (308 img) | https://universe.roboflow.com/team-ks/broken-laptop-parts | `ml/datasets/laptops/broken-laptop-parts/` |
| Laptops | Laptop Screen Damage Detection (308 img) | https://universe.roboflow.com/aanish-usman/laptop-screen-damage-detection | `ml/datasets/laptops/laptop-screen-damage-detection/` |
| Monitors | Screen Damage (60 img) | https://universe.roboflow.com/public-workspace-eocvi/screen-damage-buzm4 | `ml/datasets/monitors/screen-damage-buzm4/` |

Each unzipped folder should contain `train/`, `valid/`, (`test/` optional), and
a `data.yaml`. That's the standard Roboflow YOLOv8 export layout.



### Phones
| Dataset | Workspace/Project | Images | Classes |
|---|---|---|---|
| Mobile Damage Diagnosis | `abhinavpoc/mobile-damage-diagnosis` | 1,901 | dead pixel scratch, screen crack |
| Cracked Screen | `abhinavpoc/cracked-screen` | 300 | cracked_screen, damaged, good |
| Mobile Phone Dataset | `datacluster-labs-agryi/mobile-phone-dataset` | 100+ | cracked-screen, damaged, good |

### Laptops
| Dataset | Workspace/Project | Images | Classes |
|---|---|---|---|
| Laptop Damage Detection | `laptop-damage-detection` (search Universe for latest project slug) | 6,806 | body-damage, display-damage, keyboard-damage |
| Broken Laptop Parts | `team-ks/broken-laptop-parts` | 308 | crack, fade lines, spot |
| Laptop Screen Damage Detection | `aanish-usman/laptop-screen-damage-detection` | 308 | laptop screen damage |

### Monitors / Screens (general)
| Dataset | Workspace/Project | Images | Classes |
|---|---|---|---|
| Screen Damage | `public-workspace-eocvi/screen-damage-buzm4` | 60 | body_crack, body_scratch, lcd_line, lcd_crack, lcd_broken |

### Tablets
No dedicated tablet-damage dataset exists on Roboflow Universe as of writing.
**Approach:** merge phone + laptop-screen datasets and treat tablets as a
"large-screen phone" class during training; document this as a known dataset
gap in your capstone report (this is a legitimate, defensible design decision
that examiners respond well to — it shows awareness of real-world data
scarcity rather than hiding it).

### PC / Desktop
No PC-body damage dataset was found. Recommendation: scope PC damage detection
down to "monitor damage" + a rule-based tabular checklist (physical port damage,
POST failure, etc.) captured via the app's structured questionnaire rather than
image detection — keep this device type's flow lightweight for the capstone.

## Merge strategy
1. Download each dataset in YOLOv8 format (Roboflow gives a direct export button
   → format `YOLOv8`)
2. Remap all class names to a **unified schema**:
   - `screen_crack`
   - `screen_scratch`
   - `dead_pixel`
   - `body_damage` (dents/cracks on chassis)
   - `keyboard_damage`
   - `none` (undamaged reference images — important negative class)
3. Combine into one `ml/datasets/merged/` YOLO dataset with a single `data.yaml`

## Why this satisfies the ₹0 constraint
- Roboflow free tier: unlimited public dataset downloads, model hosting free
  up to reasonable inference volume
- YOLOv8 training: free on Google Colab (free GPU tier, T4)
- No dataset requires payment or licensing fee for non-commercial/academic use
  (all listed are CC BY 4.0 — cite them in your report per the BibTeX Roboflow provides)
