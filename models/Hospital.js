import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Hospital = sequelize.define(
  'Hospital',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('slug', value?.toLowerCase().trim());
      }
    },
    status: {
      type: DataTypes.ENUM('trial', 'active', 'suspended', 'disabled'),
      allowNull: false,
      defaultValue: 'trial'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: 'hospitals',
    indexes: [{ unique: true, fields: ['slug'] }, { fields: ['status'] }]
  }
);

export default Hospital;
