# Epic Ages - Feature Test Plan

## Visual Tests
### 🌍 World Rendering
- [ ] **Terrain Colors**: Blue water, green grass, dark green forests, gray mountains
- [ ] **World Size**: 48x32 tile procedurally generated world
- [ ] **Zoom Controls**: + and - buttons work, mouse wheel/pinch zoom
- [ ] **Pan Controls**: Click and drag to move around the world

### 🏘️ Settlement Visualization
- [ ] **Settlement Base**: Golden circle with brown outline at settlement location
- [ ] **Population Dots**: Small beige dots around settlement (should increase over time)
- [ ] **Settlement Name**: "Hearth-1" displayed below the settlement
- [ ] **Structures**: Different colored shapes for different buildings:
  - Brown squares for huts
  - Orange dots for campfires  
  - Gray circles for kilns
  - Dark brown rectangles for palisades

### 📅 Date Display
- [ ] **Era Display**: Shows "Era: STONE" 
- [ ] **Year Counter**: Shows "Year: 20,000 BC" and increments slowly
- [ ] **Date Progression**: Year should advance ~6 months per tick

## Gameplay Tests
### 🎮 Basic Actions (Button Interface)
- [ ] **Harvest**: Click "Harvest" button, check berries increase in events
- [ ] **Build Hut**: Click "Build Hut", check for brown square structure appearing
- [ ] **Research Pottery**: Click "Research Pottery", check if research succeeds
- [ ] **Found New Camp**: Click "Found new camp", check if settlement moves

### 🗣️ Natural Language Commands (Intent Box)
- [ ] **Simple Commands**:
  - Type "gather berries" → should harvest berries
  - Type "build a hut" → should build a hut if resources available
  - Type "research pottery" → should advance tech if possible
  
- [ ] **Complex Commands**:
  - "build a fence around our camp" → should build palisade
  - "research smelting" → should advance to copper age tech
  - "gift the river clan 10 wood" → should send diplomatic gift

### 🏛️ Technology Progression
- [ ] **Stone Age Start**: Begin with fire + knapping technologies
- [ ] **Tech Requirements**: Can't research advanced tech without prerequisites
- [ ] **Resource Costs**: Research should consume resources (wood, stone, etc.)
- [ ] **Era Advancement**: Reaching certain techs should advance era (stone→copper→bronze→iron→medieval)

### 🤝 Diplomacy System
- [ ] **Neighbor Relations**: River Clan and Hill Tribe appear in neighbors panel
- [ ] **Attitude System**: Attitude values (-100 to +100) shown and change over time
- [ ] **Diplomatic Actions**:
  - Gift resources → should improve attitude
  - Trade proposals → should exchange resources
  - Peace/War declarations → should change status
  - Knowledge sharing → mentioned in events

### ⏰ Passive Systems
- [ ] **Resource Generation**: Berries should slowly increase over time
- [ ] **Population Growth**: Settlement population should grow gradually
- [ ] **AI Activity**: Neighbors should take actions (building, trading, etc.)
- [ ] **Random Events**: Settlement migration, diplomacy events

## Edge Case Tests
### 🚫 Validation
- [ ] **Insufficient Resources**: Building without enough wood should show error
- [ ] **Invalid Tech**: Researching unavailable tech should fail gracefully
- [ ] **Invalid Commands**: Nonsense intent text should either parse or show helpful error

### 🔄 State Management
- [ ] **WebSocket Connection**: Events should appear in real-time
- [ ] **Page Refresh**: Game state should persist/reconnect
- [ ] **Multiple Actions**: Rapid clicking should queue actions properly

## Performance Tests
- [ ] **Smooth Rendering**: No lag when zooming/panning
- [ ] **Memory Usage**: Long gameplay sessions shouldn't slow down
- [ ] **Event History**: Events panel should handle many events gracefully

## Integration Tests
- [ ] **LLM Integration**: If OpenAI API key provided, complex intents should work better
- [ ] **Fallback Planning**: Without API key, should use naive keyword matching
- [ ] **Cross-System**: Actions affect multiple systems (building uses resources, advances settlement, etc.)

---

## How to Test
1. Open http://localhost:5173
2. Watch for 30 seconds to see passive systems working
3. Try each button action and verify expected behavior
4. Test natural language commands in the intent box
5. Observe neighbor diplomacy happening automatically
6. Check that resources, population, and era advance over time

## Expected Progression
- Start: 20,000 BC, Stone Age, 15 population, basic resources
- Early game: Build huts, research pottery/fishing, grow population
- Mid game: Advance to Copper Age, build kilns, trade with neighbors  
- Late game: Bronze Age, complex diplomacy, larger settlements
