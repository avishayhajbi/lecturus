function Group (groupId,name,date){
	return {
		groupId:groupId,
		name:name,
		date:date
	}
}
function Organization (organizationId,name){
	return {
		organizationId:organizationId,
		name:name
	}
}
function User (email,name,organization,like,dislike,rate){
	return {

		email:email,
		name:name,
		organization:organization,
		like:like,
		dislike:dislike,
		rate:rate
	}
}
function User_contacts (userId,friendId){
	return {
		userId:userId,
		friendId:friendId
	}
}
function User_Group (userId,groupId){
	return {
		userId:userId,
		groupId:groupId
	}
}
function User_Organization (userId,organizationId){
	return {
		userId:userId,
		organizationId:organizationId
	}
}