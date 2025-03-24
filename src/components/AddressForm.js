import React from 'react';

const AddressForm = ({ formData, setFormData, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="fullName">Full Name</label>
        <input 
          type="text" 
          id="fullName" 
          name="fullName" 
          required 
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label htmlFor="phone">Phone Number</label>
        <input 
          type="tel" 
          id="phone" 
          name="phone" 
          required 
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label htmlFor="address">Street Address</label>
        <input 
          type="text" 
          id="address" 
          name="address" 
          required 
          placeholder="Enter your street address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label htmlFor="city">City</label>
        <input 
          type="text" 
          id="city" 
          name="city" 
          required 
          placeholder="Enter your city"
          value={formData.city}
          onChange={(e) => setFormData({...formData, city: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label htmlFor="state">State/Province</label>
        <input 
          type="text" 
          id="state" 
          name="state" 
          required 
          placeholder="Enter your state or province"
          value={formData.state}
          onChange={(e) => setFormData({...formData, state: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label htmlFor="zipCode">ZIP/Postal Code</label>
        <input 
          type="text" 
          id="zipCode" 
          name="zipCode" 
          required 
          placeholder="Enter your ZIP or postal code"
          value={formData.zipCode}
          onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
        />
      </div>
      <button type="submit" className="confirm-btn">Confirm Address</button>
    </form>
  );
};

export default AddressForm; 