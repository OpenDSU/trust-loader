let LOADER_GLOBALS = {
 DEBUG:false,
 DEFAULT_CREDENTIALS:{
    email:"wallet@opendsu.com",
    password:"secret",
    username : "private",
    company:"OpenDSU Development INC."
  },
  THEME: "app",
  REGISTRATION_FIELDS: [
    {
      visible: true,
      fieldId: "fullname",
      validator: "anyChar",
      type: "text",
      fieldLabel: "Full name",
      placeholder: "Your full name",
      fieldHelp: "Your full name Ex. Jhon Smith"
    },
    {
      visible: true,
      fieldId: "company",
      type: "text",
      validator: "anyChar",
      fieldLabel: "Company Name",
      placeholder: "Enter your company name",
      fieldHelp: "Company name is optional"
    },
    {
      visible: true,
      fieldId: "email",
      validator: "email",
      type: "email",
      fieldLabel: "Email",
      placeholder: "Enter your email",
      fieldHelp: "Enter a valid email address"
    },
    {
      visible: true,
      fieldId: "phone",
      validator: "phone",
      type: "text",
      fieldLabel: "Phone number",
      placeholder: "Enter your phone number",
      fieldHelp: "Only numbers"
    },
    {
      visible: true,
      fieldId: "username",
      validator: "username",
      type: "text",
      fieldLabel: "Username",
      placeholder: "Enter your username",
      fieldHelp: "Username should have at least 6 characters"
    },
    {
      visible: true,
      fieldId: "password",
      type: "password",
      validator: "password",
      fieldLabel: "Password",
      placeholder: "Enter your password",
      fieldHelp: "Password min. 12 chars including 1xUpper char, 1xDigit, 1xSpecial char"
    },
    {
      visible: true,
      fieldId: "confirm-password",
      type: "password",
      validator: "confirmPassword",
      fieldLabel: "Confirm Password",
      placeholder: "Confirm your password",
      fieldHelp: "Passwords should be identical"
    }
  ],
  SHOW_ACTION_BUTTON: true,
  ACTION_BUTTON_OPTIONS: {
    option1: {
      label: "Logout",
      action: "logout"
    },
    option2: {
      label: "Change password",
      action: "changePassword"
    }
  },
  LABELS_DICTIONARY: {
    APP_NAME: "Trust loader",
    APP_DESCRIPTION: "The \"backend\" application for wallet",
    NEW_WALLET: "New Account",
    ACCESS_WALLET: "Access Account",
    RECOVER_WALLET: "Recover Wallet",
    WALLET_AUTHORIZATION: "Authorization",
    REGISTER_DETAILS: "Register details",
    COMPLETE: "Complete",
    INVALID_CREDENTIALS: "Invalid credentials",
    WRONG_KEY: "No wallet was found for provided key, please check if provided key is correct.",
    RECOVERY_TEXT: "This are recovered wallet data. Please submit a new password. This data and password will be used for future authentication.",
    PINCODE_LABEL: "Pin code",
    BACK_BUTTON_MESSAGE: "Back",
    REGISTER_BUTTON_MESSAGE: "Submit",
    REGISTER_SUCCESSFULLY: "Register successfully",

    CHANGE_PASSWORD: "Change your password",
    RECOVER_WALLET_LABEL: "Enter Recovery Key",
    RECOVER_WALLET_HELP: "Key that you saved on registration",
    OLD_PASSWORD_LABEL: "Your old password",
    OLD_PASSWORD_HELP: "This is the password you want to change",
    NEW_PASSWORD_LABEL: "Enter new password",
    NEW_PASSWORD_HELP: "Password min. 12 chars including 1xUpper char, 1xDigit, 1xSpecial char",
    CONFIRM_NEW_PASSWORD_LABEL: "Confirm your new password",
    CONFIRM_NEW_PASSWORD_HELP: "Passwords should be identical",

    ENTER_CREDENTIALS: "Enter your credentials",
    OPEN_WALLET: "Enter",
    SEED: "Seed",
    ENTER_WALLET_SEED: "Enter Wallet Seed",
    SEED_PRINT: "You can print it on a piece of paper.",
    RESTORE: "Restore",
    WALLET_RESTORED_SUCCESSFULLY: "Your wallet has been successfully restored.",
    CHANGE_WALLET: "Change wallet",
    PINCODE_HELP: "Min. 4 characters"
  },
  APP_PATHS: {
    LANDING_PAGE: "/",
    NEW_WALLET: "/newWallet.html",
    RESTORE_WALLET: "/restore",
    CHANGE_PASSWORD: "/changePassword.html"
  },
  NEW_OR_RESTORE_CONTAINER_ID: "restore-new-container",
  CHANGE_PASSWORD_CONTAINER: "change-credentials-container",
  PASSWORD_CONTAINER_ID: "credentials-container",
  MODE: 'secure',
  PINCODE_REGEX: /^.{4,}$/,
  PASSWORD_MIN_LENGTH: 12,
  USERNAME_MIN_LENGTH: 6,
  USERNAME_REGEX: /^[a-zA-Z]([A-Za-z0-9]+[\\._]{0,1}[A-Za-z0-9]+){2,10}$/,
  PHONE_REGEX: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
  EMAIL_REGEX: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
  ANY_REGEX: /^[a-z0-9 ]+$/i,
  PASSWORD_REGEX: /^(?=.*[A-Z])(?=.*[`~:;\'\"\.,<>/\?\!@#$%\^&\*\(\)\[\]\{\}|\\\-_\=\+])(?=.*[0-9])(?=.*[a-z].*[a-z].*[a-z]).*$/,
  NEW_WALLET_MORE_INFORMATION: `<div class="jumbotron p-0 m-0" align="center">
  <h1 class="display-6">Welcome to secure area!</h1>
  <p class="lead">After completing the following wizard you will gain access to your wallet.</p>
  <p class="m-0">In order to gain access you have to set up your credentials.</p>
  <hr/>
</div>`
};

export default LOADER_GLOBALS;
