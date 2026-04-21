# Workflow: learn_from_feedback

**Trigger:** After every user interaction — approval, rejection, swap, or delivery feedback

## Steps

1. **Approved outfit:** call `tools/update_style_dna.js` — increase weight of all attributes present in the approved outfit
2. **Rejected item:** identify most likely reason, update dislike signals in Style DNA for those specific attributes
3. **Swap request:** analyze the delta between rejected item and what they swapped to — the attribute difference is a strong directional signal
4. **Swap approval:** the chosen item tells you more than the rejected one — weight accordingly
5. **Post-delivery positive:** strongest possible positive signal — increase all attribute weights significantly
6. **Post-delivery negative / no engagement:** strong negative signal — flag those attributes for review
7. Recalculate confidence scores after every update
8. If a pattern appears 3+ times in the same direction (always rejecting slim fit), promote it from weak signal to confirmed preference
