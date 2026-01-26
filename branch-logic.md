# Branch Logic Documentation

## Overview
The branch system creates a chandelier-like structure by arranging multiple branch models in a circular, layered pattern. Each branch is positioned, rotated, and tilted to create a cohesive three-dimensional form that resembles a hanging light fixture.

## Core Configuration Parameters

### Structure Parameters
- **Rows**: Number of branches per circular ring (default: 15)
- **Columns**: Number of circular rings stacked vertically (default: 7)
- **Random Seed**: Controls which branch model variant appears at each position

### Positioning Parameters
- **Distance Out**: How far branches extend outward from the center (default: 0.07)
- **Rotation Offset**: Angular offset applied to middle columns (default: -0.9)

### Tilt Parameters
- **Tilt Fold Y**: Controls how much columns fold inward/outward vertically (default: 1.75)
- **Overall Fold**: Uniform folding applied to all columns (default: 0.0)

## Branch Model Assignment

### Model Types
The system uses 8 different branch models:
- **Short branches**: Models 1-5 (indices 0-4)
- **Long branches**: Models 7-8 (indices 6-7)
- **Model 6**: Excluded from random assignment (index 5)

### Assignment Algorithm

#### Step 1: Long Branch Distribution
Long branches are placed first with frequency varying by column position:

**Center Column & Column Above Center**:
- Highest frequency: Every 1-2 positions
- Creates dense long branch placement in the middle

**Second Top to Center & Center to Second Bottom**:
- Medium frequency: Every 2-3 positions
- Moderate long branch distribution

**Top & Bottom Columns**:
- Lowest frequency: Every 3-4 positions
- Sparse long branch placement at edges

The frequency patterns use the random seed to vary the exact interval slightly, creating a more organic distribution.

#### Step 2: Short Branch Spatial Distribution
After long branches are placed, remaining positions are filled with short branches using spatial analysis:

1. All unassigned positions are scored based on their distance from existing short branches
2. Positions are sorted by score (highest = furthest from other short branches)
3. Short branches are assigned prioritizing positions that maintain minimum distance (2.5 units using Manhattan distance with column weight of 1.5x)

This prevents clustering and ensures even distribution throughout the structure.

## Circular Arrangement System

### Basic Circle Pattern
Each column forms a complete circular ring where branches are evenly distributed around 360 degrees:
- Total angle: 2π radians (360 degrees)
- Angle per branch: 2π / number_of_rows
- Example with 15 rows: Each branch is 24 degrees apart

### Column-Based Spread Factor
Each column has a spread factor that determines how it differs from center:
- **Calculation**: (column_index / (total_columns - 1)) - 0.5
- **Range**: -0.5 to +0.5
- **Center column**: spread_factor = 0
- **Top column**: spread_factor = -0.5
- **Bottom column**: spread_factor = +0.5

## Rotation Calculation

### Base Rotation Components

#### Y-Axis Rotation (Circular Direction)
- **Base angle**: (branch_index / rows) × 2π
- **Plus rotation offset**: Applied with middle factor weighting
- **Plus angle spread**: Varies per column based on spread factor
- **Direction**: Points each branch tangentially around the circle

#### Z-Axis Rotation (Base Tilt)
- **Base**: π/2 (90 degrees) - orients branch perpendicular to radius
- **Plus fold Z**: Column-dependent tilt variation

#### X-Axis Rotation
- **Base tilt angle**: Default is 0.0 (hidden config)

### Advanced Rotation: Quaternion Folding

After base Euler rotations, additional rotations are applied using quaternions:

#### Fold X Quaternion
- **Axis**: X-axis (1, 0, 0)
- **Angle**: spread_factor × tiltFoldX (default tiltFoldX = 0.0)
- **Effect**: Tilts branches up/down in tangential direction

#### Fold Y Quaternion
- **Axis**: Y-axis (0, 1, 0)
- **Angle**: spread_factor × tiltFoldY (default = 1.75)
- **Effect**: Controls vertical opening/closing of columns
- **Higher values**: Outer columns fold outward more dramatically
- **Lower values**: Columns remain more vertical

#### Overall Fold Quaternion
- **Axis**: Y-axis (0, 1, 0)
- **Angle**: overallFold value (uniform for all columns)
- **Effect**: Tilts entire structure uniformly without column variation

#### Quaternion Combination Order
Base rotation → Fold X → Fold Y → Overall Fold

Each multiplication compounds the rotation, with later rotations applied in local space of previous transformations.

## Position Calculation

### Inward Direction Vector
The position of each branch is determined by an "inward direction" vector:

#### Initial Direction
- **X component**: sin(angle)
- **Y component**: 0
- **Z component**: cos(angle)

This creates a radial vector pointing outward from the center at the branch's circular angle.

#### Fold Y Rotation of Direction
The inward direction is rotated by the Fold Y angle to ensure branches point toward the center even when columns are folded:

**Rotation Axis** (perpendicular to inward direction):
- **X component**: -cos(angle)
- **Y component**: 0
- **Z component**: sin(angle)

This axis is tangent to the circle, allowing the direction to tilt toward/away from vertical while maintaining radial alignment.

#### Random Distance Variation
Each branch gets a random distance adjustment:
- **Range**: 0 to 0.1 units
- **Exception**: Model 6 (branch 7) has no variation (distance = 0)
- **Seed-based**: Uses random seed + global instance index × 1000

### Final Position Formula

**Base Distance Inward**:
- Edge factor: abs(spread_factor × 2)
- Base distance: edge_factor × 0.3
- Adjusts for edges being 0.3 units inward, center at 0

**Total Distance**:
base_distance - distance_out + random_variation

**Position Vector**:
- **X**: inward_direction.x × total_distance
- **Y**: inward_direction.y × total_distance
- **Z**: inward_direction.z × total_distance

## Distance Inward Behavior

### Edge vs Center Columns

**Center Column (spread_factor = 0)**:
- edge_factor = 0
- base_distance_inward = 0
- Position is controlled purely by distance_out parameter

**Top/Bottom Columns (spread_factor = ±0.5)**:
- edge_factor = 1
- base_distance_inward = 0.3
- Branches pushed 0.3 units inward from their circular position

**Middle Columns**:
- Linear interpolation between center and edges
- Creates smooth transition from center to outer columns

### Distance Out Parameter Effect
- Subtracts from base distance inward
- Positive values: Branches move outward
- Negative values: Branches move inward
- Range: -0.05 to 0.07

## Rotation Offset Distribution

The rotation offset parameter creates a staggered effect between columns:

### Middle Factor Calculation
middle_factor = 1 - abs(spread_factor × 2)

**Center column**: middle_factor = 1 (full offset applied)
**Edge columns**: middle_factor = 0 (no offset)
**Transition**: Smooth falloff from center to edges

### Column Angle Offset
column_angle_offset = rotation_offset × middle_factor

This means:
- **Center columns** get maximum angular offset (rotated most)
- **Edge columns** have no angular offset (remain aligned)
- **Creates visual depth** as columns rotate differently

## Recreating the System

### Step-by-Step Process

1. **Define Structure**
   - Choose number of rows (branches per ring)
   - Choose number of columns (vertical rings)
   - Select random seed for reproducible patterns

2. **Assign Branch Models**
   - Place long branches first with frequency based on column position
   - Fill remaining positions with short branches using spatial distribution scoring
   - Maintain minimum distance between short branches

3. **Calculate Column Properties**
   - For each column, compute spread factor
   - Derive fold amounts, edge factors, and middle factors

4. **Position Each Branch**
   - Calculate circular angle: (row / total_rows) × 2π
   - Apply rotation offset weighted by middle factor
   - Create inward direction vector from angle
   - Rotate direction by fold Y to account for column tilt
   - Add random distance variation (except model 6)
   - Calculate total distance: base + edge adjustment - distance_out + variation
   - Set position: direction × total_distance

5. **Calculate Rotation**
   - Set base Euler angles:
     - X = tilt_angle
     - Y = angle + angle_spread
     - Z = π/2 + fold_z
   - Convert to quaternion
   - Create fold quaternions (X, Y, overall)
   - Multiply in order: base × fold_X × fold_Y × overall_fold

6. **Apply Transformations**
   - Set branch position from step 4
   - Set branch rotation from step 5
   - Update instance matrix

7. **Special Cases**
   - Glass meshes at indices matching specific names get 1.2x scale
   - Scale is applied around mesh geometry center
   - Position offset compensates for scaling to maintain world position

## Key Principles

### Circular Symmetry
All branches follow circular patterns at their column level, with systematic variations creating organic irregularity.

### Column-Based Variation
Properties change smoothly from center to edge columns using spread factors, creating graduated visual effects.

### Radial Alignment
Branches point inward toward center through careful rotation of inward direction vectors, maintaining structural cohesion even when columns fold.

### Distance Management
Multiple distance parameters layer together:
- Base circular radius (implicit)
- Edge-based inward push
- User-controlled distance out
- Random variation per branch

### Rotation Stacking
Rotations are applied in sequence, with each affecting the coordinate space of subsequent rotations, allowing complex orientations from simple parameters.

### Weighted Distribution
The middle factor and edge factor create smooth gradients of effects from center to edges, avoiding abrupt transitions.
