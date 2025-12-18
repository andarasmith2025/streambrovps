# Modal Structure Audit - New Stream Modal

## Expected Structure:
```
<div id="newStreamModal" class="fixed...">                    <!-- Line 206 -->
  <div class="modal-container flex flex-col">                 <!-- Line 207 -->
    <div class="flex-shrink-0">HEADER</div>                   <!-- Line 209 -->
    <div class="flex-shrink-0">TAB SWITCHER</div>             <!-- Line 228 -->
    <div class="flex-1 overflow-y-auto">                      <!-- Line 244 -->
      <form id="newStreamForm">                               <!-- Line 244 -->
        <!-- Select Video -->
        <!-- Stream Title -->
        <div id="youtubeApiFields" class="hidden">            <!-- Line 281 -->
          <!-- Description -->
          <!-- Stream Configuration -->
          <!-- Stream Key -->
          <!-- Additional Settings -->
        </div>                                                <!-- Line 467 - MUST CLOSE HERE -->
        
        <div id="manualRtmpFields">                           <!-- Line 470 -->
          <!-- Stream Configuration -->
          <!-- Stream Key -->
        </div>                                                <!-- Line 533 - MUST CLOSE HERE -->
        
        <!-- Schedule Settings -->                            <!-- Line 536 -->
      </form>                                                 <!-- Line 632 -->
    </div>                                                    <!-- Line 634 - Close flex-1 -->
    
    <div class="flex-shrink-0">FOOTER BUTTONS</div>          <!-- Line 637 -->
  </div>                                                      <!-- Line 656 - Close modal-container -->
</div>                                                        <!-- Line 657 - Close newStreamModal -->
```

## Problem:
If buttons appear in dashboard footer instead of modal footer, it means:
1. Modal container div is not closed properly
2. One of the inner divs (youtubeApiFields or manualRtmpFields) is not closed
3. The flex-1 overflow-y-auto div is not closed

## Action:
Need to manually count and verify ALL div tags from line 206 to 657.
