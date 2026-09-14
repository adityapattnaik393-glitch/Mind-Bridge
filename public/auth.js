/* ============================================================================
   MindBridge — sign-in and create-account page logic.
   Both pages load this file; it picks its behaviour from the form present.
   ==========================================================================*/

(function () {
  "use strict";

  /* An existing session skips the auth pages entirely. */
  if (MB.redirectIfSignedIn()) return;

  var signInForm = document.getElementById("signInForm");
  var signUpForm = document.getElementById("signUpForm");
  var message = document.getElementById("formMessage");
  var submitBtn = document.getElementById("submitBtn");

  function say(text, isGood) {
    message.textContent = text || "";
    message.classList.toggle("ok", Boolean(isGood));
  }

  function busy(state, label) {
    submitBtn.disabled = state;
    submitBtn.textContent = label;
  }

  function markInvalid(id, invalid) {
    var field = document.getElementById(id);
    if (field) field.classList.toggle("invalid", Boolean(invalid));
  }

  function value(id) {
    var field = document.getElementById(id);
    return field ? field.value.trim() : "";
  }

  /** Digits only; drops a 91 country code or a leading 0. */
  function normaliseMobile(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    else if (digits.length === 11 && digits.charAt(0) === "0") digits = digits.slice(1);
    return digits;
  }

  function validMobile(digits) {
    return digits.length >= 10 && digits.length <= 15;
  }

  /* Live formatting: keep only digits in the mobile field. */
  var mobileField = document.getElementById("mobile");
  if (mobileField) {
    mobileField.addEventListener("input", function () {
      var cleaned = this.value.replace(/[^\d\s+]/g, "");
      if (cleaned !== this.value) this.value = cleaned;
      markInvalid("mobile", false);
      say("");
    });
  }

  /* ------------------------------------------------------------- sign in */
  if (signInForm) {
    signInForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var mobile = normaliseMobile(value("mobile"));
      var password = document.getElementById("password").value;

      markInvalid("mobile", false);
      markInvalid("password", false);

      if (!validMobile(mobile)) {
        markInvalid("mobile", true);
        return say("Enter the 10-digit mobile number used at sign-up.");
      }
      if (!password) {
        markInvalid("password", true);
        return say("Please enter your password.");
      }

      busy(true, "Signing in…");
      say("");

      try {
        var data = await MB.publicApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ mobile: mobile, password: password })
        });
        MB.session.save(data.session);
        window.location.href = "patient.html";
      } catch (error) {
        say(error.message);
        busy(false, "Sign in");
      }
    });
  }

  /* -------------------------------------------------------- create account */
  if (signUpForm) {
    signUpForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var caretakerName = value("caretakerName");
      var patientName = value("patientName");
      var mobile = normaliseMobile(value("mobile"));
      var languageCode = value("languageCode") || "en";
      var age = value("age");
      var region = value("region");
      var password = document.getElementById("password").value;
      var confirmPassword = document.getElementById("confirmPassword").value;

      ["caretakerName", "patientName", "mobile", "password", "confirmPassword"]
        .forEach(function (id) { markInvalid(id, false); });

      if (!caretakerName) {
        markInvalid("caretakerName", true);
        return say("Please enter the caretaker's name.");
      }
      if (!patientName) {
        markInvalid("patientName", true);
        return say("Please enter the patient's name.");
      }
      if (!validMobile(mobile)) {
        markInvalid("mobile", true);
        return say("Enter a valid 10-digit mobile number.");
      }
      if (password.length < 6) {
        markInvalid("password", true);
        return say("Password must be at least 6 characters.");
      }
      if (password !== confirmPassword) {
        markInvalid("confirmPassword", true);
        return say("The two passwords do not match.");
      }

      busy(true, "Creating account…");
      say("");

      try {
        var data = await MB.publicApi("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            caretakerName: caretakerName,
            patientName: patientName,
            mobile: mobile,
            password: password,
            languageCode: languageCode,
            age: age || undefined,
            region: region || undefined
          })
        });
        MB.session.save(data.session);
        say("Account created. Opening the dashboard…", true);
        window.location.href = "patient.html";
      } catch (error) {
        say(error.message);
        if (error.status === 409) markInvalid("mobile", true);
        busy(false, "Create account");
      }
    });
  }
})();
