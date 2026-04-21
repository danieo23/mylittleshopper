# Workflow: score_products

**Trigger:** Called internally after every product search

**Objective:** Score every product against the user's Style DNA before it reaches the outfit builder

## Scoring Model

| Factor | Points |
|--------|--------|
| Color matches primary palette | +25 |
| Color matches secondary palette | +15 |
| Color is in avoided list | -40 |
| Fit matches dominant fit preference | +20 |
| Fit matches a rejected fit | -35 |
| Style category matches primary | +20 |
| Style category matches secondary | +10 |
| Brand in affinity list | +10 |
| Price within typical spend for category | +10 |
| Price significantly over typical spend | -20 |
| Similar to previously approved items | +15 |
| Similar to previously rejected items | -30 |

**Score range:** 0–100  
**Threshold:** Pass items scoring 60+ to the outfit builder  
**High confidence:** Flag items scoring 85+ as high-confidence picks
