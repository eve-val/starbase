#!/usr/bin/env python

import collections
import json
import sqlite3

class SDE:
	def __init__(self, db):
		self.db = db

	def groups_in_category(self, category):
		c = self.db.cursor()
		c.execute("SELECT categoryID FROM invCategories WHERE categoryName = ?", (category,))
		category_id = c.fetchone()[0]

		c.execute("SELECT groupName FROM invGroups WHERE categoryID = ?", (category_id,))
		return map(lambda x: x[0], c.fetchall())

	def group_id(self, group):
		c = self.db.cursor()
		c.execute("SELECT groupID FROM invGroups WHERE groupName = ?", (group,))
		return c.fetchone()[0]

	def items_in_group(self, group):
		group_id = self.group_id(group)

		# dirty hack here - some of the QA towers are marked published, so
		# filter them by name instead of published field.
		c = self.db.cursor()
		c.execute("""SELECT typeName FROM invTypes WHERE groupID = ?
				  AND typeName NOT LIKE 'QA %' AND published = 1""", (group_id,))
		return map(lambda x: x[0], c.fetchall())

	def item_id(self, item_name):
		c = self.db.cursor()
		c.execute("SELECT typeID FROM invTypes WHERE typeName = ?", (item_name,))
		return c.fetchone()[0]

	def item_name(self, item_id):
		c = self.db.cursor()
		c.execute("SELECT typeName FROM invTypes WHERE typeID = ?", (item_id,))
		return c.fetchone()[0]

	def item_attribute(self, item_name, attribute_name):
		c = self.db.cursor()
		item_id = self.item_id(item_name)

		c.execute("SELECT attributeID FROM dgmAttributeTypes WHERE attributeName = ?", (attribute_name,))
		attribute_id = c.fetchone()[0]

		c.execute("SELECT valueInt, valueFloat FROM dgmTypeAttributes WHERE typeID = ? AND attributeID = ?",
				  (item_id, attribute_id))
		values = c.fetchone()
		if not values:
			return None
		return values[0] or values[1]

	def item_volume(self, item_name):
		c = self.db.cursor()
		c.execute("SELECT volume FROM invTypes WHERE typeName = ?", (item_name,))
		return c.fetchone()[0]

	def item_meta_group(self, item_name):
		meta_group_id = self.item_attribute(item_name, 'metaGroupID')
		if not meta_group_id:
			return None
		c = self.db.cursor()
		c.execute("SELECT metaGroupName FROM invMetaGroups WHERE metaGroupID = ?", (meta_group_id,))
		return c.fetchone()[0]

	def faction_name(self, faction_id):
		c = self.db.cursor()
		c.execute("SELECT factionName FROM chrFactions WHERE factionID = ?", (faction_id,))
		return c.fetchone()[0]

	def control_tower_resources(self, tower_name):
		c = self.db.cursor()
		tower_id = self.item_id(tower_name)

		purpose_map = {}
		c.execute("SELECT purpose,purposeText FROM invControlTowerResourcePurposes")
		for r in c.fetchall():
			purpose_map[r[0]] = r[1].lower()

		c.execute("SELECT resourceTypeID,purpose,quantity,minSecurityLevel,factionID FROM invControlTowerResources WHERE controlTowerTypeID = ?", (tower_id,))
		resources = collections.defaultdict(lambda: {})
		for r in c.fetchall():
			(type_id, purpose_id, qty, sec, faction_id) = r
			type_name = self.item_name(type_id)
			purpose = purpose_map[purpose_id]
			resources[type_name] = {
				'purpose': purpose,
				'perhour': qty,
			}
			if sec != None:
				resources[type_name]['empire'] = self.faction_name(faction_id)
		return resources

def bonused_weapon_type(sde, tower_type):
	def hasbonus(name):
		return sde.item_attribute(tower_type, 'controlTower%sBonus' % name)
	if hasbonus('LaserDamage') or hasbonus('LaserOptimal'):
		return 'energy'
	if hasbonus('MissileROF') or hasbonus('MissileVelocity'):
		return 'missile'
	if hasbonus('HybridDamage') or hasbonus('HybridOptimal'):
		return 'hybrid'
	if hasbonus('ProjectileROF') or hasbonus('ProjectileFalloff') or hasbonus('ProjectileOptimal'):
		return 'projectile'
	return None

def tower_resonances(sde, tower_type):
	def getresonance(name):
		return sde.item_attribute(tower_type, 'shield%sDamageResonance' % name)
	return {
		'em': getresonance('Em'),
		'thermal': getresonance('Thermal'),
		'kinetic': getresonance('Kinetic'),
		'explosive': getresonance('Explosive')
	}

def hps(sde, item_type):
	return {
		'structure': sde.item_attribute(item_type, 'hp'),
		'armor': sde.item_attribute(item_type, 'armorHP'),
		# this is a float, :ccp:
		'shield': int(sde.item_attribute(item_type, 'shieldCapacity'))
	}

def tower_fuels(sde, tower_type):
	return sde.control_tower_resources(tower_type)

def dump_towers(sde):
	towers = {}
	tower_types = sde.items_in_group('Control Tower')
	for ty in tower_types:
		t = {'name': ty}
		t['id'] = sde.item_id(ty)
		t['power'] = sde.item_attribute(ty, 'powerOutput')
		t['cpu'] = sde.item_attribute(ty, 'cpuOutput')
		mg = sde.item_meta_group(ty)
		t['faction'] = (mg == 'Faction')
		t['resonances'] = tower_resonances(sde, ty)
		t['hp'] = hps(sde, ty)
		t['fuel'] = tower_fuels(sde, ty)
		wt = bonused_weapon_type(sde, ty)
		if wt:
			t['weapon_type'] = wt
		towers[ty] = t
	return towers

def mod_weapon_type(sde, type_name):
	charge_group_id = sde.item_attribute(type_name, 'chargeGroup1')
	if charge_group_id == sde.group_id('Projectile Ammo'):
		return 'projectile'
	if charge_group_id == sde.group_id('Hybrid Charge'):
		return 'hybrid'
	if charge_group_id == sde.group_id('Frequency Crystal'):
		return 'energy'
	if charge_group_id == sde.group_id('Torpedo'):
		return 'missile'
	if charge_group_id == sde.group_id('Cruise Missile'):
		return 'missile'
	if charge_group_id == sde.group_id('Citadel Torpedo'):
		return 'missile'
	return None

def mod_resonances(sde, type_name):
	def getresonance(name):
		return sde.item_attribute(type_name, '%sDamageResonanceMultiplier' % name)
	rs = {
		'em': getresonance('em'),
		'thermal': getresonance('thermal'),
		'kinetic': getresonance('kinetic'),
		'explosive': getresonance('explosive')
	}
	if rs['em'] or rs['thermal'] or rs['kinetic'] or rs['explosive']:
		return rs
	return None

def dump_mods(sde):
	mods = {}
	mod_groups = sde.groups_in_category('Structure')
	# hack: control towers are themselves under the structure group but aren't
	# tower modules. We remove that group here to avoid including the towers in the module array.
	mod_groups.remove('Control Tower')
	for gr in mod_groups:
		mod_types = sde.items_in_group(gr)
		for ty in mod_types:
			t = {'name': ty}
			t['id'] = sde.item_id(ty)
			t['group'] = gr
			t['power'] = sde.item_attribute(ty, 'power') or 0
			t['cpu'] = sde.item_attribute(ty, 'cpu') or 0
			t['faction'] = sde.item_meta_group(ty) == 'Faction'
			t['hp'] = hps(sde, ty)
			rm = mod_resonances(sde, ty)
			if rm:
				t['resonance_multipliers'] = rm
			wt = mod_weapon_type(sde, ty)
			if wt:
				t['weapon_type'] = wt
			mods[ty] = t
	return mods

conn = sqlite3.connect('sqlite-latest.sqlite')
sde = SDE(conn)

towers = dump_towers(sde)
mods = dump_mods(sde)

print 'starbase_static = %s;' % json.dumps({'towers': towers, 'mods': mods}, indent=4, sort_keys=True)