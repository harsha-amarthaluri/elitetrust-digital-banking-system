package com.bank_application.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.bank_application.backend.entity.User;
import com.bank_application.backend.repository.UserRepo;

@Service
public class UserService implements UserDetailsService {
	
	@Autowired
	UserRepo userRepo;
	
	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		User user = userRepo.getByMobileNumber(username);
		if (user == null) {
			throw new UsernameNotFoundException("User not found with mobile number: " + username);
		}
		return user;
	}
	
	public List<User> getAllUser() {
		return userRepo.findAll();
	}
	
	@org.springframework.cache.annotation.Cacheable(value = "users", key = "#mobileNumber")
	public User getUser(String mobileNumber) {
		return userRepo.getByMobileNumber(mobileNumber);
	}
	
	public User createUser(User user) {
		 return userRepo.save(user);
	}
	
	@org.springframework.cache.annotation.CacheEvict(value = "users", key = "#result.mobileNumber")
	public User updateUser(long id ,User user) {
		User existingUser = userRepo.findById(id)
				.orElseThrow(()-> new RuntimeException("User not found with the id :"+id));
		
		existingUser.setEmail(user.getEmail());
		existingUser.setName(user.getName());
		existingUser.setPassword(user.getPassword());
		if (user.getKycStatus() != null) {
			existingUser.setKycStatus(user.getKycStatus());
		}
		if (user.getRole() != null) {
			existingUser.setRole(user.getRole());
		}
		
		return userRepo.save(existingUser);
	}
	
	@org.springframework.cache.annotation.CacheEvict(value = "users", allEntries = true)
	public boolean deleteUser(Long id) {
		Optional<User> existingUser = userRepo.findById(id);
		
		if(existingUser.isPresent()) {
			userRepo.delete(existingUser.get());
			return true;
		}
		return false;
	}
}
